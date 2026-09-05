import { db } from "./firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  generateCampaignSuggestions,
  activateCampaign,
  deactivateCampaign,
  getActiveCampaign,
} from "./services/campaigns";

async function testOrchestratorDeduplicationAndRulesSafety() {
  console.log("===============================================================");
  console.log("  TEST: Campaign Orchestrator Deduplication & Rules Safety     ");
  console.log("===============================================================\n");

  const merchantId = "demo_merchant";

  // 1. Verify rules/current dailySpendLimit in Firestore
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const rulesSnap = await getDoc(rulesRef);
  if (!rulesSnap.exists()) {
    throw new Error("rules/current does not exist in Firestore!");
  }
  const rules = rulesSnap.data();
  console.log("Step 1: Checking rules/current in Firestore...");
  console.log(`  dailySpendLimit = ₹${rules.dailySpendLimit}`);
  console.log(`  maxOrderAmount = ₹${rules.maxOrderAmount}`);
  console.log(`  approvalThreshold = ₹${rules.approvalThreshold}`);

  if (rules.dailySpendLimit !== 25000) {
    throw new Error(`Failed: dailySpendLimit is ₹${rules.dailySpendLimit}, expected merchant-set ₹25000`);
  }
  console.log("✓ rules/current has sane merchant-set dailySpendLimit: ₹25000.\n");

  // 2. Count existing campaigns before running
  const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);
  const snapBefore = await getDocs(campaignsRef);
  const countBefore = snapBefore.size;
  console.log(`Step 2: Existing campaigns in Firestore: ${countBefore}`);

  // 3. Run orchestrator first time
  console.log("\nStep 3: Running generateCampaignSuggestions (Run 1)...");
  const run1 = await generateCampaignSuggestions(merchantId);
  console.log(`  Run 1 generated ${run1.length} new campaigns:`);
  run1.forEach((c) => console.log(`    - "${c.title}" [${c.id}]`));

  const snapAfterRun1 = await getDocs(campaignsRef);
  console.log(`  Total campaigns in Firestore after Run 1: ${snapAfterRun1.size}`);

  // 4. Run orchestrator second time in a row (must detect existing and skip duplicates)
  console.log("\nStep 4: Running generateCampaignSuggestions (Run 2 - immediately after)...");
  const run2 = await generateCampaignSuggestions(merchantId);
  console.log(`  Run 2 generated ${run2.length} new campaigns (Expected: 0 duplicates):`);
  run2.forEach((c) => console.log(`    - "${c.title}" [${c.id}]`));

  if (run2.length !== 0) {
    throw new Error(`Failed: Run 2 generated ${run2.length} duplicates! Expected 0.`);
  }

  const snapAfterRun2 = await getDocs(campaignsRef);
  console.log(`  Total campaigns in Firestore after Run 2: ${snapAfterRun2.size}`);
  if (snapAfterRun2.size !== snapAfterRun1.size) {
    throw new Error(`Failed: Firestore campaign count increased on duplicate run! Before: ${snapAfterRun1.size}, After: ${snapAfterRun2.size}`);
  }
  console.log("✓ Duplicate prevention verified: zero duplicates created on second run.\n");

  // 5. Test campaign activation and verify rules/current is NEVER mutated
  console.log("Step 5: Activating a campaign...");
  const allCampaignsSnap = await getDocs(campaignsRef);
  const targetCampaign = allCampaignsSnap.docs.map(d => ({ id: d.id, ...d.data() })).find((c: any) => c.status === "suggested");
  if (!targetCampaign) {
    throw new Error("No suggested campaign found to activate");
  }

  console.log(`  Activating campaign "${(targetCampaign as any).title}" [${targetCampaign.id}]...`);
  const activated = await activateCampaign(merchantId, targetCampaign.id, 48);
  console.log(`  Status: ${activated.status}, expiresAt: ${activated.expiresAt}`);

  // Verify rules/current directly from Firestore server
  const rulesSnapAfterActivation = await getDoc(rulesRef);
  const rulesAfterActivation = rulesSnapAfterActivation.data();
  console.log(`  rules/current dailySpendLimit after activation: ₹${rulesAfterActivation?.dailySpendLimit}`);

  if (rulesAfterActivation?.dailySpendLimit !== 25000) {
    throw new Error(`CRITICAL: Campaign activation mutated rules/current dailySpendLimit to ₹${rulesAfterActivation?.dailySpendLimit}!`);
  }
  console.log("✓ Verified: Campaign activation DID NOT touch rules/current (still ₹25000).\n");

  // 6. Test duplicate prevention against ACTIVE campaign
  console.log("Step 6: Running orchestrator with an ACTIVE campaign...");
  const runWithActive = await generateCampaignSuggestions(merchantId);
  console.log(`  Run with active campaign generated ${runWithActive.length} campaigns (Expected: 0 duplicates):`);
  if (runWithActive.some(c => c.title === (targetCampaign as any).title)) {
    throw new Error(`Failed: Generated duplicate for an already ACTIVE campaign "${(targetCampaign as any).title}"`);
  }
  console.log("✓ Verified: Orchestrator skips generating campaigns that match active campaigns.\n");

  // 7. Clean up: Deactivate campaign
  console.log("Step 7: Deactivating campaign and verifying rules/current...");
  await deactivateCampaign(merchantId, targetCampaign.id);
  const rulesSnapAfterDeactivate = await getDoc(rulesRef);
  if (rulesSnapAfterDeactivate.data()?.dailySpendLimit !== 25000) {
    throw new Error("CRITICAL: rules/current dailySpendLimit changed after deactivation!");
  }
  console.log("✓ Deactivation clean, rules/current remains exactly ₹25000.");

  console.log("\n===============================================================");
  console.log("  ALL CAMPAIGN DEDUPLICATION & SAFETY TESTS PASSED!            ");
  console.log("===============================================================");
  process.exit(0);
}

testOrchestratorDeduplicationAndRulesSafety().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
