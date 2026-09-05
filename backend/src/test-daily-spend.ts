import { evaluatePurchaseRequest, getMerchantTodayApprovedSpend } from "./services/firewall";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";
import { calculateTodayApprovedSpend } from "@shared/api";

async function runDailySpendLimitTest() {
  console.log("=================================================");
  console.log("  TEST: Real-Time Daily Spend Limit Enforcement  ");
  console.log("=================================================\n");

  const merchantId = "demo_merchant";
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const rulesSnap = await getDoc(rulesRef);
  if (!rulesSnap.exists()) {
    throw new Error("Merchant rules not found");
  }

  const originalRules = rulesSnap.data();
  const originalLimit = Number(originalRules.dailySpendLimit || 25000);
  console.log(`Original Daily Spend Limit: ₹${originalLimit}`);

  try {
    // 1. Check initial today's spend
    const initialSpent = await getMerchantTodayApprovedSpend(merchantId);
    console.log(`Initial today approved spend: ₹${initialSpent}`);

    // Verify consistency with calculateTodayApprovedSpend
    const allTxnsSnap = await getDocs(collection(db, `merchants/${merchantId}/transactions`));
    const allTxns = allTxnsSnap.docs.map(d => d.data());
    const expectedInitial = calculateTodayApprovedSpend(allTxns);
    console.log(`Expected initial spend from calculateTodayApprovedSpend: ₹${expectedInitial}`);
    if (initialSpent !== expectedInitial) {
      throw new Error(`Spend mismatch: getMerchantTodayApprovedSpend (${initialSpent}) !== calculateTodayApprovedSpend (${expectedInitial})`);
    }
    console.log("✓ Initial spend calculation is 100% consistent.\n");

    // Fetch catalog to find a low-cost item
    const catalogSnap = await getDocs(collection(db, `merchants/${merchantId}/catalog`));
    const products = catalogSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    // Find an item with price around 500-1500 that is in allowedCategories and <= maxOrderAmount
    const testProduct = products.find(p => p.price >= 400 && p.price <= 1500 && originalRules.allowedCategories.includes(p.category));
    if (!testProduct) {
      throw new Error("Could not find a suitable test product in catalog");
    }
    console.log(`Using test product: "${testProduct.name}" (Price: ₹${testProduct.price}, Category: ${testProduct.category})`);

    // 2. Test auto-approved purchase within limit
    // Set daily limit to initialSpent + testProduct.price + 100 (enough for 1 purchase, but NOT 2)
    const tightLimit = initialSpent + testProduct.price + 100;
    console.log(`\nSetting temporary test dailySpendLimit to ₹${tightLimit} (current: ₹${initialSpent})...`);
    await setDoc(rulesRef, { ...originalRules, dailySpendLimit: tightLimit }, { merge: true });

    const agentA = `agt_spend_test_${Date.now()}`;
    console.log(`\nStep 1: Attempting first purchase of ₹${testProduct.price} for agent ${agentA}...`);
    const res1 = await evaluatePurchaseRequest(merchantId, agentA, testProduct.id, testProduct.price);
    console.log("Result 1:", { decision: res1.decision, reason: res1.reason });

    if (res1.decision !== "approved") {
      throw new Error(`Expected first purchase to be approved within limit, but got: ${res1.decision} (${res1.reason})`);
    }
    console.log("✓ First purchase approved within daily limit.");

    const spentAfter1 = await getMerchantTodayApprovedSpend(merchantId);
    console.log(`Spend after 1st purchase: ₹${spentAfter1} (Expected: ₹${initialSpent + testProduct.price})`);
    if (spentAfter1 !== initialSpent + testProduct.price) {
      throw new Error(`Spend after purchase mismatch: got ₹${spentAfter1}, expected ₹${initialSpent + testProduct.price}`);
    }
    console.log("✓ Spend counter updated accurately in real-time.");

    // 3. Test purchase that WOULD EXCEED daily limit
    console.log(`\nStep 2: Attempting second purchase of ₹${testProduct.price} (Remaining limit: ₹${tightLimit - spentAfter1})...`);
    const res2 = await evaluatePurchaseRequest(merchantId, agentA, testProduct.id, testProduct.price);
    console.log("Result 2:", { decision: res2.decision, reason: res2.reason });

    if (res2.decision !== "blocked") {
      throw new Error(`Expected second purchase to be BLOCKED, but got: ${res2.decision}`);
    }
    if (!res2.reason.includes(`Would exceed daily spend limit of ₹${tightLimit}`)) {
      throw new Error(`Expected reason to contain 'Would exceed daily spend limit of ₹${tightLimit}', got: ${res2.reason}`);
    }
    console.log("✓ Second purchase BLOCKED with required reason: 'Would exceed daily spend limit of ₹<limit>'");

    const spentAfter2 = await getMerchantTodayApprovedSpend(merchantId);
    if (spentAfter2 !== spentAfter1) {
      throw new Error(`Blocked purchase incremented spend! Old: ₹${spentAfter1}, New: ₹${spentAfter2}`);
    }
    console.log("✓ Spend counter remained unchanged after blocked purchase.");

    // 4. Test recovery acceptance when it would exceed daily spend limit
    console.log(`\nStep 3: Attempting accepted recovery that would exceed daily spend limit...`);
    const resRecovery = await evaluatePurchaseRequest(
      merchantId,
      agentA,
      testProduct.id,
      testProduct.price,
      undefined,
      true // isRecoveryAcceptance
    );
    console.log("Recovery Acceptance Result:", { decision: resRecovery.decision, reason: resRecovery.reason });

    if (resRecovery.decision !== "blocked") {
      throw new Error(`Expected accepted recovery to be BLOCKED when exceeding limit, but got: ${resRecovery.decision}`);
    }
    if (!resRecovery.reason.includes(`Would exceed daily spend limit of ₹${tightLimit}`)) {
      throw new Error(`Expected recovery block reason to contain 'Would exceed daily spend limit of ₹${tightLimit}', got: ${resRecovery.reason}`);
    }
    console.log("✓ Recovery acceptance BLOCKED at moment of payment when exceeding limit.");

    // 5. Test manual approval override when it would exceed daily spend limit
    console.log(`\nStep 4: Attempting overrideDecision='approved' when it would exceed daily spend limit...`);
    const resOverride = await evaluatePurchaseRequest(
      merchantId,
      agentA,
      testProduct.id,
      testProduct.price,
      "approved" // overrideDecision
    );
    console.log("Override Result:", { decision: resOverride.decision, reason: resOverride.reason });

    if (resOverride.decision !== "blocked") {
      throw new Error(`Expected overrideDecision='approved' to be BLOCKED when exceeding limit, but got: ${resOverride.decision}`);
    }
    if (!resOverride.reason.includes(`Would exceed daily spend limit of ₹${tightLimit}`)) {
      throw new Error(`Expected override block reason to contain 'Would exceed daily spend limit of ₹${tightLimit}', got: ${resOverride.reason}`);
    }
    console.log("✓ Manual override BLOCKED at moment of payment when exceeding limit.");

    // 6. Test Approval Queue route (/api/resolve) when approving an escalated transaction
    console.log("\nStep 5: Testing /api/resolve with simulated escalated transaction...");
    // Create an escalated transaction under normal high threshold
    const highValItem = products.find(p => p.price > 2000 && p.price <= originalRules.maxOrderAmount);
    if (highValItem) {
      const agentEsc = `agt_esc_test_${Date.now()}`;
      // Temporarily open limit so it escalates instead of blocking on daily limit
      await setDoc(rulesRef, { ...originalRules, dailySpendLimit: 100000 }, { merge: true });
      const escRes = await evaluatePurchaseRequest(merchantId, agentEsc, highValItem.id, highValItem.price);
      console.log("Escalated request created:", { id: escRes.transactionId, decision: escRes.decision, amount: highValItem.price });

      if (escRes.decision === "escalated" && escRes.transactionId) {
        // Now set dailySpendLimit back to tightLimit (which is already reached)
        await setDoc(rulesRef, { ...originalRules, dailySpendLimit: tightLimit }, { merge: true });

        // Call resolve endpoint
        const resolveResponse = await fetch("http://localhost:8080/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: escRes.transactionId,
            approve: true,
          }),
        });

        console.log(`Resolve HTTP status: ${resolveResponse.status}`);
        const resolveJson = await resolveResponse.json();
        console.log("Resolve response body:", resolveJson);

        if (resolveResponse.status !== 400) {
          throw new Error(`Expected HTTP 400 when approving over daily limit, got ${resolveResponse.status}`);
        }
        if (!resolveJson.error?.includes(`Would exceed daily spend limit of ₹${tightLimit}`)) {
          throw new Error(`Expected error to contain 'Would exceed daily spend limit of ₹${tightLimit}', got: ${resolveJson.error}`);
        }
        console.log("✓ Approval Queue resolution rejected with HTTP 400 and spend limit error message.");
      }
    }

    console.log("\n=================================================");
    console.log("  ALL DAILY SPEND LIMIT TESTS PASSED SUCCESSFULLY!  ");
    console.log("=================================================");
  } finally {
    // Restore original rules
    console.log(`\nRestoring original dailySpendLimit to ₹${originalLimit}...`);
    await setDoc(rulesRef, { ...originalRules, dailySpendLimit: originalLimit });
    console.log("✓ Original rules restored.");
  }
}

runDailySpendLimitTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
