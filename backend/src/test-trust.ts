import { evaluatePurchaseRequest } from "./services/firewall";
import { getAgentTrust, getTrustTier } from "./services/agentTrust";
import { doc, getDocFromServer, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "./firebase";

async function runTest() {
  console.log("=== Testing Adaptive Agent Trust Score System ===");
  const merchantId = "demo_merchant";

  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const rulesSnap = await getDocFromServer(rulesRef);
  if (!rulesSnap.exists()) {
    throw new Error("Rules document not found");
  }
  const rules = rulesSnap.data();

  console.log("Current Merchant Rules:", {
    maxOrderAmount: rules.maxOrderAmount,
    dailySpendLimit: rules.dailySpendLimit,
    approvalThreshold: rules.approvalThreshold,
    allowedCategories: rules.allowedCategories,
  });

  const catalogSnap = await getDocs(collection(db, `merchants/${merchantId}/catalog`));
  const products = catalogSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  console.log(`Found ${products.length} catalog items.`);

  const allowedProduct = products.find(p => rules.allowedCategories?.includes(p.category) && p.price <= rules.approvalThreshold);
  const highValueProduct = products.find(p => rules.allowedCategories?.includes(p.category) && p.price > rules.approvalThreshold && p.price <= rules.maxOrderAmount);
  const disallowedProduct = products.find(p => !rules.allowedCategories?.includes(p.category));

  console.log("Test sample items:", {
    allowed: allowedProduct ? { id: allowedProduct.id, name: allowedProduct.name, price: allowedProduct.price, category: allowedProduct.category } : null,
    highValue: highValueProduct ? { id: highValueProduct.id, name: highValueProduct.name, price: highValueProduct.price, category: highValueProduct.category } : null,
    disallowed: disallowedProduct ? { id: disallowedProduct.id, name: disallowedProduct.name, price: disallowedProduct.price, category: disallowedProduct.category } : null,
  });

  // Ensure we have a product for our tests:
  // If no highValue product, create a temporary one in catalog
  let testHighValId = highValueProduct?.id;
  if (!testHighValId) {
    testHighValId = "prod_test_high_val";
    const testCat = rules.allowedCategories?.[0] || "electronics";
    await setDoc(doc(db, `merchants/${merchantId}/catalog`, testHighValId), {
      name: "High Value Test Item",
      price: rules.approvalThreshold + 500, // between approvalThreshold and maxOrderAmount
      category: testCat,
      inStock: true,
    });
  }

  let testAllowedId = allowedProduct?.id;
  if (!testAllowedId) {
    testAllowedId = "prod_test_allowed";
    const testCat = rules.allowedCategories?.[0] || "electronics";
    await setDoc(doc(db, `merchants/${merchantId}/catalog`, testAllowedId), {
      name: "Normal Allowed Item",
      price: Math.min(rules.approvalThreshold - 500, 500),
      category: testCat,
      inStock: true,
    });
  }

  let testDisallowedId = disallowedProduct?.id;
  if (!testDisallowedId) {
    testDisallowedId = "prod_test_disallowed";
    await setDoc(doc(db, `merchants/${merchantId}/catalog`, testDisallowedId), {
      name: "Disallowed Category Item",
      price: 200,
      category: "unauthorized_restricted_cat",
      inStock: true,
    });
  }

  // -------------------------------------------------------------
  // TEST SCENARIO 1: Trusted Agent (score >= 80)
  // -------------------------------------------------------------
  const trustedAgentId = `agt_trusted_${Date.now()}`;
  console.log(`\n--- Scenario 1: Trusted Agent (${trustedAgentId}) ---`);

  // Start with score 74 so 3 approved purchases brings score to 80 (74 + 3*2 = 80)
  await setDoc(doc(db, `merchants/${merchantId}/agentTrust`, trustedAgentId), {
    score: 74,
    totalRequests: 0,
    approvedCount: 0,
    blockedCount: 0,
    recoveredCount: 0,
    deniedEscalations: 0,
    updatedAt: new Date().toISOString(),
  });

  let currentTrust = await getAgentTrust(merchantId, trustedAgentId);
  console.log(`Initial Agent Trust: Score=${currentTrust.score}, Tier=${getTrustTier(currentTrust.score)}`);

  // Fetch product data to pass actual price
  const allowedDoc = (await getDocFromServer(doc(db, `merchants/${merchantId}/catalog`, testAllowedId))).data()!;
  for (let i = 1; i <= 3; i++) {
    const res = await evaluatePurchaseRequest(
      merchantId,
      trustedAgentId,
      testAllowedId,
      allowedDoc.price
    );
    console.log(`Purchase ${i} [₹${allowedDoc.price}]: Decision=${res.decision}, Reason="${res.reason}"`);
  }

  currentTrust = await getAgentTrust(merchantId, trustedAgentId);
  console.log(`Updated Agent Trust: Score=${currentTrust.score}, Tier=${getTrustTier(currentTrust.score)}`);

  // Now test an order above normal approvalThreshold:
  const highValDoc = (await getDocFromServer(doc(db, `merchants/${merchantId}/catalog`, testHighValId))).data()!;
  console.log(`Testing purchase above normal threshold (₹${highValDoc.price} > ₹${rules.approvalThreshold})...`);
  const relaxedRes = await evaluatePurchaseRequest(
    merchantId,
    trustedAgentId,
    testHighValId,
    highValDoc.price
  );

  console.log(`Relaxed Order Result: Decision=${relaxedRes.decision}, Reason="${relaxedRes.reason}"`);
  if (relaxedRes.decision === "approved" && relaxedRes.reason.includes("relaxed threshold")) {
    console.log("✓ SUCCESS: Trusted Agent auto-approved above normal threshold with relaxed threshold reason!");
  } else {
    console.error("✗ FAILURE: Expected auto-approval with relaxed threshold reason, got:", relaxedRes);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST SCENARIO 2: Flagged Agent (score < 30)
  // -------------------------------------------------------------
  const flaggedAgentId = `agt_flagged_${Date.now()}`;
  console.log(`\n--- Scenario 2: Flagged Agent (${flaggedAgentId}) ---`);

  currentTrust = await getAgentTrust(merchantId, flaggedAgentId);
  console.log(`Initial Agent Trust: Score=${currentTrust.score}, Tier=${getTrustTier(currentTrust.score)}`);

  const disallowedDoc = (await getDocFromServer(doc(db, `merchants/${merchantId}/catalog`, testDisallowedId))).data()!;
  // Simulate 3 blocked requests (-10 each -> 50 - 30 = 20 < 30)
  for (let i = 1; i <= 3; i++) {
    const res = await evaluatePurchaseRequest(
      merchantId,
      flaggedAgentId,
      testDisallowedId,
      disallowedDoc.price
    );
    console.log(`Blocked Request ${i}: Decision=${res.decision}, Reason="${res.reason}"`);
  }

  currentTrust = await getAgentTrust(merchantId, flaggedAgentId);
  console.log(`Updated Agent Trust after 3 blocked requests: Score=${currentTrust.score}, Tier=${getTrustTier(currentTrust.score)}`);

  // Test even a small purchase that would normally auto-approve:
  console.log(`Testing small purchase [₹${allowedDoc.price}] with Flagged Agent...`);
  const flaggedRes = await evaluatePurchaseRequest(
    merchantId,
    flaggedAgentId,
    testAllowedId,
    allowedDoc.price
  );

  console.log(`Small Purchase Result: Decision=${flaggedRes.decision}, Reason="${flaggedRes.reason}"`);
  if (flaggedRes.decision === "escalated" && flaggedRes.reason.includes("Flagged") && flaggedRes.reason.includes("all purchases require approval")) {
    console.log("✓ SUCCESS: Flagged agent had effectiveThreshold = 0, small purchase was escalated!");
  } else {
    console.error("✗ FAILURE: Expected escalation for Flagged agent, got:", flaggedRes);
    process.exit(1);
  }

  console.log("\n=== Adaptive Agent Trust Score System Tests Passed! ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
