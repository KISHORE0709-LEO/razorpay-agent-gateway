import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import {
  evaluatePurchaseRequest,
  getMerchantTodayApprovedSpend,
  resetMerchantDailySpend,
} from "./services/firewall";

async function runResetSpendTest() {
  console.log("=================================================");
  console.log("  TEST: Reset Today's Spend Functionality       ");
  console.log("=================================================\n");

  const merchantId = "demo_merchant";
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Check initial state of dailySpend collection
  const spendRef = collection(db, `merchants/${merchantId}/dailySpend`);
  const initialSpendSnap = await getDocs(spendRef);
  console.log(`Total dailySpend docs in collection before reset: ${initialSpendSnap.size}`);

  const pastDayDocsBefore: string[] = [];
  const todayDocsBefore: string[] = [];

  initialSpendSnap.forEach((d) => {
    const data = d.data();
    if (data.date === todayStr || d.id.endsWith(`_${todayStr}`)) {
      todayDocsBefore.push(d.id);
    } else {
      pastDayDocsBefore.push(d.id);
    }
  });

  console.log(`  - Today's docs (${todayStr}): ${todayDocsBefore.length} (${todayDocsBefore.join(", ")})`);
  console.log(`  - Past days' docs: ${pastDayDocsBefore.length} (${pastDayDocsBefore.join(", ")})`);

  // Record initial transaction count to ensure ledger is NEVER touched
  const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
  const txnsSnapBefore = await getDocs(txnsRef);
  const txnCountBefore = txnsSnapBefore.size;
  console.log(`Total transactions in audit log before reset: ${txnCountBefore}`);

  // 2. Perform resetMerchantDailySpend
  console.log("\n--- Executing resetMerchantDailySpend ---");
  const resetResult = await resetMerchantDailySpend(merchantId);
  console.log("Reset result:", resetResult);

  if (resetResult.deletedCount !== todayDocsBefore.length) {
    console.warn(`Warning: Expected ${todayDocsBefore.length} deleted, got ${resetResult.deletedCount}`);
  }

  // 3. Verify today's documents are gone and past days' documents remain
  const afterResetSpendSnap = await getDocs(spendRef);
  const pastDayDocsAfter: string[] = [];
  const todayDocsAfter: string[] = [];

  afterResetSpendSnap.forEach((d) => {
    const data = d.data();
    if (data.date === todayStr || d.id.endsWith(`_${todayStr}`)) {
      todayDocsAfter.push(d.id);
    } else {
      pastDayDocsAfter.push(d.id);
    }
  });

  console.log(`\nAfter reset verification:`);
  console.log(`  - Today's docs remaining: ${todayDocsAfter.length}`);
  console.log(`  - Past days' docs remaining: ${pastDayDocsAfter.length}`);

  if (todayDocsAfter.length > 0) {
    throw new Error(`Failed: Today's docs were not completely removed! Found: ${todayDocsAfter.join(", ")}`);
  }
  if (pastDayDocsAfter.length !== pastDayDocsBefore.length) {
    throw new Error(`Failed: Past days' records were mutated! Before: ${pastDayDocsBefore.length}, After: ${pastDayDocsAfter.length}`);
  }
  console.log("✓ All today's dailySpend docs cleanly deleted, past days preserved!");

  // 4. Verify transaction history was NOT touched
  const txnsSnapAfter = await getDocs(txnsRef);
  if (txnsSnapAfter.size !== txnCountBefore) {
    throw new Error(`Failed: Transaction count changed from ${txnCountBefore} to ${txnsSnapAfter.size}! Transactions must NEVER be deleted.`);
  }
  console.log(`✓ Transaction ledger untouched: exactly ${txnsSnapAfter.size} transactions preserved.`);

  // 5. Verify running daily spend counter is now exactly 0
  const spendAfterReset = await getMerchantTodayApprovedSpend(merchantId);
  console.log(`Running daily spend counter after reset: ₹${spendAfterReset}`);
  if (spendAfterReset !== 0) {
    throw new Error(`Failed: getMerchantTodayApprovedSpend should return 0 after reset, got ₹${spendAfterReset}`);
  }
  console.log("✓ Running daily spend counter is exactly ₹0!");

  // 6. Test a new purchase request against base limit (without needing inflation)
  const rulesSnap = await getDoc(doc(db, `merchants/${merchantId}/rules/current`));
  const rules = rulesSnap.data()!;
  console.log(`\nMerchant base dailySpendLimit: ₹${rules.dailySpendLimit}`);

  // Fetch catalog item
  const catalogSnap = await getDocs(collection(db, `merchants/${merchantId}/catalog`));
  const products = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
  const item = products.find(
    (p) => p.price <= rules.maxOrderAmount && (rules.allowedCategories || []).includes(p.category)
  ) || products[0];

  console.log(`Evaluating test purchase of "${item.name}" (₹${item.price})...`);
  const testAgent = `agt_clean_test_${Date.now()}`;
  const evalResult = await evaluatePurchaseRequest(
    merchantId,
    testAgent,
    item.id,
    item.price,
    undefined, // overrideDecision
    false,     // isRecoveryAcceptance
    false,     // isEnhanceAcceptance
    true       // skipEnhance
  );
  console.log(`Purchase decision: ${evalResult.decision}, reason: "${evalResult.reason}"`);

  if (evalResult.decision !== "approved") {
    throw new Error(`Expected approved decision with fresh daily limit, but got: ${evalResult.decision}`);
  }
  console.log("✓ Purchase approved starting from clean ₹0 spend!");

  // 7. Verify new spend document was created and counter is now equal to item.price
  const newSpendTotal = await getMerchantTodayApprovedSpend(merchantId);
  console.log(`Running spend after test purchase: ₹${newSpendTotal} (Expected: ₹${item.price})`);
  if (newSpendTotal !== item.price) {
    throw new Error(`Spend counter mismatch: expected ₹${item.price}, got ₹${newSpendTotal}`);
  }
  console.log("✓ Spend counter accurately tracked new transaction!");

  // 8. Clean reset again
  console.log("\nCleaning up test spend...");
  await resetMerchantDailySpend(merchantId);
  const finalSpend = await getMerchantTodayApprovedSpend(merchantId);
  console.log(`Final spend after clean-up: ₹${finalSpend}`);
  if (finalSpend !== 0) {
    throw new Error(`Final cleanup failed: spend is ₹${finalSpend}`);
  }
  console.log("✓ Clean-up verified: running spend is ₹0.");

  console.log("\n=================================================");
  console.log("  ALL RESET SPEND TESTS PASSED PERFECTLY!        ");
  console.log("=================================================");
  process.exit(0);
}

runResetSpendTest().catch((err) => {
  console.error("\n❌ TEST ERROR:", err);
  process.exit(1);
});
