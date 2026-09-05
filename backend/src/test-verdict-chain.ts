import { evaluatePurchaseRequest, computeTxnHash, computeOutcomeUpdateHash, GENESIS_HASH } from "./services/firewall";
import { doc, getDocFromServer, getDocs, collection, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

async function runVerdictChainTest() {
  console.log("=== Testing Verdict Chain & Immutable Resolution System ===");
  const merchantId = "demo_merchant";

  // 1. Get high-value product that requires approval (> approvalThreshold, <= maxOrderAmount)
  const rulesSnap = await getDocFromServer(doc(db, `merchants/${merchantId}/rules/current`));
  const rules = rulesSnap.data()!;
  console.log("Merchant Rules:", {
    approvalThreshold: rules.approvalThreshold,
    maxOrderAmount: rules.maxOrderAmount,
  });

  const catalogSnap = await getDocs(collection(db, `merchants/${merchantId}/catalog`));
  const products = catalogSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const highValItem = products.find(p => p.price > rules.approvalThreshold && p.price <= rules.maxOrderAmount);
  if (!highValItem) {
    throw new Error("No high value product found for escalation test");
  }

  const testAgentId = `agt_vc_verifier_${Date.now()}`;
  console.log(`\nStep 1: Creating escalated transaction for agent ${testAgentId}...`);
  console.log(`Product: ${highValItem.name}, Amount: ₹${highValItem.price} (Threshold: ₹${rules.approvalThreshold})`);

  const evalResult = await evaluatePurchaseRequest(
    merchantId,
    testAgentId,
    highValItem.id,
    highValItem.price
  );

  console.log("Evaluation Result:", {
    decision: evalResult.decision,
    reason: evalResult.reason,
    transactionId: evalResult.transactionId,
  });

  if (evalResult.decision !== "escalated" || !evalResult.transactionId) {
    throw new Error(`Expected decision 'escalated', got '${evalResult.decision}'`);
  }

  const originalTxId = evalResult.transactionId;

  // 2. Inspect original transaction in Firestore at creation time
  const originalTxSnapBefore = await getDocFromServer(doc(db, `merchants/${merchantId}/transactions/${originalTxId}`));
  const originalDataBefore = originalTxSnapBefore.data()!;

  console.log("\nStep 2: Original Transaction Document at Creation:");
  console.log({
    id: originalTxId,
    decision: originalDataBefore.decision,
    reason: originalDataBefore.reason,
    hash: originalDataBefore.hash,
    prevHash: originalDataBefore.prevHash,
  });

  // Verify creation hash
  const expectedOriginalHash = computeTxnHash(originalDataBefore.prevHash, originalDataBefore as any);
  if (expectedOriginalHash !== originalDataBefore.hash) {
    throw new Error(`Original creation hash mismatch! Expected ${expectedOriginalHash}, got ${originalDataBefore.hash}`);
  }
  console.log("✓ Original entry hash is cryptographically valid at creation.");

  // 3. Simulate Approval Queue "Approve" action via HTTP POST /api/resolve
  console.log("\nStep 3: Simulating Approval Queue Approve action via backend API...");
  const resolveRes = await fetch("http://localhost:8080/api/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transactionId: originalTxId,
      approve: true,
    }),
  });

  if (!resolveRes.ok) {
    const errorText = await resolveRes.text();
    throw new Error(`Failed to resolve approval: ${errorText}`);
  }

  const resolveBody = await resolveRes.json();
  console.log("Resolve response:", resolveBody);

  // 4. Verify Original Document is UNCHANGED / IMMUTABLE
  console.log("\nStep 4: Checking Original Transaction Document in Firestore post-resolution...");
  const originalTxSnapAfter = await getDocFromServer(doc(db, `merchants/${merchantId}/transactions/${originalTxId}`));
  const originalDataAfter = originalTxSnapAfter.data()!;

  console.log({
    id: originalTxId,
    decision: originalDataAfter.decision,
    reason: originalDataAfter.reason,
    hash: originalDataAfter.hash,
  });

  if (originalDataAfter.decision !== "escalated") {
    throw new Error(`MUTATION DETECTED: Original decision changed to '${originalDataAfter.decision}'! It must stay 'escalated'.`);
  }
  if (originalDataAfter.reason !== originalDataBefore.reason) {
    throw new Error(`MUTATION DETECTED: Original reason changed!`);
  }
  if (originalDataAfter.hash !== originalDataBefore.hash) {
    throw new Error(`MUTATION DETECTED: Original hash changed!`);
  }
  console.log("✓ SUCCESS: Original escalated entry is provably UNCHANGED and immutable!");

  // 5. Verify the NEW outcome_update document
  console.log("\nStep 5: Verifying the new outcome_update entry...");
  const outcomeDocSnap = await getDocFromServer(doc(db, `merchants/${merchantId}/transactions/${resolveBody.outcomeUpdateId}`));
  if (!outcomeDocSnap.exists()) {
    throw new Error(`Outcome update document '${resolveBody.outcomeUpdateId}' not found!`);
  }
  const outcomeData = outcomeDocSnap.data()!;
  console.log("Outcome Update Document:", {
    type: outcomeData.type,
    relatedTransactionId: outcomeData.relatedTransactionId,
    outcome: outcomeData.outcome,
    reason: outcomeData.reason,
    prevHash: outcomeData.prevHash,
    hash: outcomeData.hash,
    orderId: outcomeData.orderId,
  });

  if (outcomeData.type !== "outcome_update") throw new Error("Expected type 'outcome_update'");
  if (outcomeData.relatedTransactionId !== originalTxId) throw new Error("Mismatch in relatedTransactionId");
  if (outcomeData.outcome !== "approved") throw new Error("Expected outcome 'approved'");

  const expectedOutcomeHash = computeOutcomeUpdateHash(outcomeData.prevHash, {
    timestamp: outcomeData.timestamp || outcomeData.time,
    relatedTransactionId: outcomeData.relatedTransactionId,
    outcome: outcomeData.outcome,
    reason: outcomeData.reason,
  });

  if (expectedOutcomeHash !== outcomeData.hash) {
    throw new Error(`Outcome update hash mismatch! Expected ${expectedOutcomeHash}, got ${outcomeData.hash}`);
  }
  console.log("✓ SUCCESS: outcome_update hash matches canonical immutable formula!");

  // 6. Verify Complete Verdict Chain from Genesis to Latest
  console.log("\nStep 6: Verifying Full Cryptographic Chain Integrity...");
  const txnsQuery = query(collection(db, `merchants/${merchantId}/transactions`), orderBy("time", "desc"));
  const allTxnsSnap = await getDocs(txnsQuery);
  const chain = allTxnsSnap.docs.map(d => ({ id: d.id, ...d.data() })).reverse() as any[];

  let currentPrev = GENESIS_HASH;
  let verifiedCount = 0;

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];

    // Linkage check
    if (block.prevHash && block.prevHash !== currentPrev) {
      throw new Error(`Linkage broken at block #${i + 1} (${block.id}). Expected prev: ${currentPrev}, got ${block.prevHash}`);
    }

    // Recompute hash
    let recomputed: string;
    if (block.type === "outcome_update") {
      recomputed = computeOutcomeUpdateHash(block.prevHash || GENESIS_HASH, {
        timestamp: block.timestamp || block.time,
        relatedTransactionId: block.relatedTransactionId,
        outcome: block.outcome,
        reason: block.reason,
      });
    } else {
      recomputed = computeTxnHash(block.prevHash || GENESIS_HASH, block);
    }

    if (block.hash && recomputed !== block.hash) {
      throw new Error(`Hash mismatch at block #${i + 1} (${block.id})! Recomputed: ${recomputed}, stored: ${block.hash}`);
    }

    currentPrev = block.hash || recomputed;
    verifiedCount++;
  }

  console.log(`✓ SUCCESS: All ${verifiedCount} blocks in the Verdict Chain verified with ZERO mismatches!`);
  console.log("\n=== Verdict Chain Verification Test PASSED! ===");
  process.exit(0);
}

runVerdictChainTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
