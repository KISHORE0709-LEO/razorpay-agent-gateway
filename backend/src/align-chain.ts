import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { computeTxnHash, computeOutcomeUpdateHash, GENESIS_HASH } from "./services/firewall";

async function alignChain() {
  console.log("Aligning all chain blocks to the canonical immutable hashing formula...");
  const txnsQuery = query(collection(db, "merchants/demo_merchant/transactions"), orderBy("time", "desc"));
  const snap = await getDocs(txnsQuery);
  const chain = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse() as any[];

  console.log(`Total blocks in chain: ${chain.length}`);

  let currentPrev = GENESIS_HASH;
  let updatedCount = 0;

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];

    // Compute canonical hash with immutable fields
    let canonicalHash: string;
    if (block.type === "outcome_update") {
      canonicalHash = computeOutcomeUpdateHash(currentPrev, {
        timestamp: block.timestamp || block.time,
        relatedTransactionId: block.relatedTransactionId,
        outcome: block.outcome,
        reason: block.reason,
      });
    } else {
      canonicalHash = computeTxnHash(currentPrev, {
        time: block.time,
        timestamp: block.timestamp,
        agent: block.agent,
        agentId: block.agentId,
        product: block.product,
        productId: block.productId,
        amount: block.amount,
        requestedAmount: block.requestedAmount,
        decision: block.decision,
        reason: block.reason,
      });
    }

    const needsUpdate = (block.prevHash !== currentPrev) || (block.hash !== canonicalHash);
    if (needsUpdate) {
      await updateDoc(doc(db, "merchants/demo_merchant/transactions", block.id), {
        prevHash: currentPrev,
        hash: canonicalHash,
      });
      updatedCount++;
      console.log(`Updated block #${i + 1} (${block.id})`);
    }

    currentPrev = canonicalHash;
  }

  console.log(`Aligned complete chain. Updated ${updatedCount} blocks.`);
  process.exit(0);
}

alignChain().catch((err) => {
  console.error("Error aligning chain:", err);
  process.exit(1);
});
