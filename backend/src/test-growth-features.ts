import { evaluatePurchaseRequest } from "./services/firewall";
import {
  generateCampaignSuggestions,
  activateCampaign,
  deactivateCampaign,
  getActiveCampaign,
} from "./services/campaigns";
import { db } from "./firebase";
import { doc, getDocFromServer, collection, getDocs, setDoc } from "firebase/firestore";

async function runTests() {
  console.log("=== STARTING GROWTH FEATURES INTEGRATION TEST ===");
  const merchantId = "demo_merchant";
  const agentId = "agt_growth_test";

  const rulesSnap = await getDocFromServer(doc(db, `merchants/${merchantId}/rules/current`));
  const baseRules = rulesSnap.data() as any;
  const origDailyLimit = baseRules.dailySpendLimit || 25000;

  // Import getMerchantTodayApprovedSpend to verify spend
  const { getMerchantTodayApprovedSpend } = await import("./services/firewall");
  const currentSpent = await getMerchantTodayApprovedSpend(merchantId);
  console.log(`Current spend today: ₹${currentSpent} (Daily limit: ₹${origDailyLimit})`);

  // Grant temporary headroom so growth test passes without daily spend cap blockage
  if (currentSpent + 25000 >= origDailyLimit) {
    console.log(`Adjusting daily limit temporarily for test to ₹${currentSpent + 100000}`);
    await setDoc(doc(db, `merchants/${merchantId}/rules/current`), {
      ...baseRules,
      dailySpendLimit: currentSpent + 100000,
    });
  }

  const catalogSnap = await getDocs(collection(db, `merchants/${merchantId}/catalog`));
  const catalog = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  console.log(`Merchant base maxOrderAmount: ₹${baseRules.maxOrderAmount}`);
  console.log(`Enhance threshold (<50% cap): < ₹${baseRules.maxOrderAmount * 0.5}`);

  // ----------------------------------------------------
  // TEST 1: Enhance Offer (Upsell / Cross-Sell)
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Triggering Enhance Offer ---");
  // Find a product < 50% cap
  const cheapItem = catalog.find((p) => p.price < baseRules.maxOrderAmount * 0.5);
  if (!cheapItem) {
    throw new Error("No catalog item found under 50% max order cap to test Enhance!");
  }
  console.log(`Found candidate item: "${cheapItem.name}" (₹${cheapItem.price}, Category: ${cheapItem.category})`);

  const initialEval = await evaluatePurchaseRequest(merchantId, agentId, cheapItem.id, cheapItem.price);
  console.log(`Initial eval decision: ${initialEval.decision}`);
  console.log(`Initial eval reason: ${initialEval.reason}`);

  if (initialEval.decision !== "enhanced") {
    throw new Error(`Expected decision 'enhanced', got '${initialEval.decision}'`);
  }
  if (!initialEval.enhancedProduct) {
    throw new Error("Expected enhancedProduct to be populated!");
  }
  console.log(`✓ Enhanced product suggested: "${initialEval.enhancedProduct.name}" (₹${initialEval.enhancedProduct.price}, Category: ${initialEval.enhancedProduct.category})`);

  // Test 1b: Decline Enhance (proceed with original)
  console.log("\n--- TEST 1b: Decline Enhance (Proceed with Original) ---");
  const declineEval = await evaluatePurchaseRequest(
    merchantId,
    agentId,
    cheapItem.id,
    cheapItem.price,
    undefined, // overrideDecision
    false,     // isRecoveryAcceptance
    false,     // isEnhanceAcceptance
    true       // skipEnhance
  );
  console.log(`Decline eval decision: ${declineEval.decision}`);
  console.log(`Decline eval reason: ${declineEval.reason}`);
  if (declineEval.decision === "enhanced") {
    throw new Error("Decline failed: evaluatePurchaseRequest returned 'enhanced' instead of processing original!");
  }
  console.log(`✓ Decline correctly bypassed enhance loop with decision '${declineEval.decision}'`);

  // Test 1c: Accept Enhance (Upgrade Order)
  console.log("\n--- TEST 1c: Accept Enhance (Upgrade Order) ---");
  const acceptEval = await evaluatePurchaseRequest(
    merchantId,
    agentId,
    initialEval.enhancedProduct.id,
    initialEval.enhancedProduct.price,
    undefined, // overrideDecision
    false,     // isRecoveryAcceptance
    true,      // isEnhanceAcceptance
    false      // skipEnhance
  );
  console.log(`Accept eval decision: ${acceptEval.decision}`);
  console.log(`Accept eval reason: ${acceptEval.reason}`);
  if (acceptEval.decision !== "approved" && acceptEval.decision !== "escalated") {
    throw new Error(`Expected approved/escalated on upgrade, got '${acceptEval.decision}'`);
  }
  if (!acceptEval.reason.includes("Enhance offer: upgraded to")) {
    throw new Error(`Expected reason to include 'Enhance offer: upgraded to', got '${acceptEval.reason}'`);
  }
  console.log(`✓ Accept upgrade successfully approved and logged with enhance audit reason!`);

  // ----------------------------------------------------
  // TEST 2: Campaign Orchestrator
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Campaign Orchestrator Suggestions ---");
  const suggestions = await generateCampaignSuggestions(merchantId);
  console.log(`Generated ${suggestions.length} campaign suggestions`);
  for (const s of suggestions) {
    console.log(`  - [${s.id}] "${s.title}": ${s.suggestion}`);
    console.log(`    Override:`, JSON.stringify(s.ruleOverride));

    // Verify 20% safety ceiling
    if (s.ruleOverride.maxOrderAmount) {
      const maxAllowed = Math.round(baseRules.maxOrderAmount * 1.2);
      if (s.ruleOverride.maxOrderAmount > maxAllowed) {
        throw new Error(`Safety ceiling breached! ${s.ruleOverride.maxOrderAmount} > ${maxAllowed}`);
      }
    }
  }
  console.log("✓ All campaign suggestions strictly comply with the <= 20% safety ceiling!");

  // Activate a campaign that raises maxOrderAmount
  console.log("\n--- TEST 2b: Activating Campaign and Verifying Override in Firewall ---");
  // Find or create a campaign with maxOrderAmount override = baseRules.maxOrderAmount * 1.1 (e.g. 5500 if base is 5000)
  const targetCampaign = suggestions.find((s) => s.ruleOverride.maxOrderAmount) || suggestions[0];
  const targetCap = Math.round(baseRules.maxOrderAmount * 1.1); // +10% override
  targetCampaign.ruleOverride.maxOrderAmount = targetCap;

  // Save and activate target campaign
  const campaignRef = doc(db, `merchants/${merchantId}/campaigns/${targetCampaign.id}`);
  await setDoc(campaignRef, targetCampaign);
  await activateCampaign(merchantId, targetCampaign.id, 48);

  const active = await getActiveCampaign(merchantId);
  console.log(`Active campaign in Firestore: "${active?.title}", Status: ${active?.status}, Expires: ${active?.expiresAt}`);
  if (!active || active.id !== targetCampaign.id) {
    throw new Error("Active campaign verification failed in Firestore!");
  }

  // Find a product or test amount between base cap and campaign cap
  // Base cap: 5000, Campaign cap: 5500. Test amount: 5300
  const testAmount = Math.round((baseRules.maxOrderAmount + targetCap) / 2); // e.g. 5250
  console.log(`Testing purchase of ₹${testAmount} (Base cap: ₹${baseRules.maxOrderAmount}, Campaign cap: ₹${targetCap})`);

  // Pick any allowed product in catalog, evaluate with requestedAmount = testAmount
  const allowedCategories = (baseRules.allowedCategories || []).map((c: string) => c.toLowerCase());
  const testProduct = catalog.find((p) => allowedCategories.includes(p.category.toLowerCase())) || catalog[0];
  const campaignEval = await evaluatePurchaseRequest(
    merchantId,
    agentId,
    testProduct.id,
    testAmount,
    undefined, // overrideDecision
    false,     // isRecoveryAcceptance
    false,     // isEnhanceAcceptance
    true       // skipEnhance
  );

  console.log(`Campaign test decision: ${campaignEval.decision}`);
  console.log(`Campaign test reason: ${campaignEval.reason}`);
  console.log(`Campaign applied tag: ${campaignEval.campaignApplied}`);

  // Under base rules, testAmount > baseRules.maxOrderAmount would be blocked or recovered.
  // With campaign, it must pass within campaign-adjusted cap!
  if (campaignEval.decision === "blocked") {
    throw new Error(`Failed: Request for ₹${testAmount} was blocked despite active campaign cap of ₹${targetCap}! Reason: ${campaignEval.reason}`);
  }
  if (!campaignEval.reason.includes("campaign-adjusted cap")) {
    throw new Error(`Failed: Transaction reason did not explicitly name the campaign cap! Reason: ${campaignEval.reason}`);
  }
  console.log(`✓ Campaign override successfully applied! Transaction reason: "${campaignEval.reason}"`);

  // Clean up
  console.log("\n--- Deactivating Test Campaign & Restoring Rules ---");
  await deactivateCampaign(merchantId, targetCampaign.id);
  const afterDeactivate = await getActiveCampaign(merchantId);
  console.log(`Active campaign after deactivation: ${afterDeactivate ? afterDeactivate.id : "None (clean)"}`);

  await setDoc(doc(db, `merchants/${merchantId}/rules/current`), baseRules);
  console.log("✓ Base merchant rules restored cleanly.");

  console.log("\n=== ALL GROWTH FEATURES TESTS PASSED PERFECTLY! ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ TEST ERROR:", err);
  process.exit(1);
});
