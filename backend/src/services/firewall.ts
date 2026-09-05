import { db } from "../firebase";
import { collection, doc, getDoc, getDocFromServer, getDocs, limit, orderBy, query, setDoc, where, addDoc } from "firebase/firestore";
import * as crypto from "crypto";
import { createRazorpayOrder } from "./razorpay";
import {
  getAgentTrust,
  getTrustTier,
  computeEffectiveThreshold,
  updateAgentTrustOnTransaction,
} from "./agentTrust";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export function computeTxnHash(
  prevHash: string,
  data: {
    time?: string;
    timestamp?: string;
    agent?: string;
    agentId?: string;
    product?: string;
    productId?: string;
    amount?: number;
    requestedAmount?: number;
    decision: string;
    reason: string;
  }
): string {
  const timeVal = data.timestamp || data.time || "";
  const agentVal = data.agentId || data.agent || "";
  const prodVal = data.productId || data.product || "";
  const amountVal = Number(data.requestedAmount ?? data.amount ?? 0);
  const decisionVal = data.decision || "";
  const reasonVal = data.reason || "";
  const payload = `${prevHash}|${timeVal}|${agentVal}|${prodVal}|${amountVal}|${decisionVal}|${reasonVal}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function computeOutcomeUpdateHash(
  prevHash: string,
  data: {
    timestamp?: string;
    time?: string;
    relatedTransactionId: string;
    outcome: string;
    reason: string;
  }
): string {
  const timeVal = data.timestamp || data.time || "";
  const payload = `${prevHash}|${timeVal}|outcome_update|${data.relatedTransactionId}|${data.outcome}|${data.reason}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function evaluatePurchaseRequest(
  merchantId: string, 
  agentId: string, 
  productId: string, 
  requestedAmount: number,
  overrideDecision?: "approved" | "blocked",
  isRecoveryAcceptance?: boolean
) {
  // 1. Fetch rules, product, and agent trust profile FRESH from Firestore server
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const productRef = doc(db, `merchants/${merchantId}/catalog/${productId}`);
  
  const [rulesSnap, productSnap, agentTrust] = await Promise.all([
    getDocFromServer(rulesRef),
    getDocFromServer(productRef),
    getAgentTrust(merchantId, agentId)
  ]);

  if (!rulesSnap.exists()) {
    throw new Error(`Rules not found for merchant ${merchantId}`);
  }
  if (!productSnap.exists()) {
    throw new Error(`Product not found: ${productId}`);
  }

  const rules = rulesSnap.data();
  const product = productSnap.data();

  // Compute trust tier and adaptive effective threshold
  const trustTier = getTrustTier(agentTrust.score);
  const { effectiveThreshold, isRelaxed, isStrict } = computeEffectiveThreshold(
    agentTrust.score,
    Number(rules.approvalThreshold || 0),
    Number(rules.maxOrderAmount || 0)
  );

  let decision: "approved" | "recovered" | "escalated" | "blocked";
  let reason: string;
  let recoveryProduct: any = undefined;

  const dateKey = new Date().toISOString().split("T")[0];
  const dailySpendDocId = `${agentId}_${dateKey}`;
  const dailySpendRef = doc(db, `merchants/${merchantId}/dailySpend/${dailySpendDocId}`);
  const dailySpendSnap = await getDocFromServer(dailySpendRef);
  let todaySpent = 0;
  let todayCount = 0;
  if (dailySpendSnap.exists()) {
    const d = dailySpendSnap.data();
    todaySpent = Number(d.amount || 0);
    todayCount = Number(d.count || 0);
  }

  if (overrideDecision) {
    decision = overrideDecision;
    reason = overrideDecision === "approved" ? "Approved by merchant" : "Manually denied by merchant";
  } else {
    // 2. Check category allow-list (HARD LIMIT - NEVER overridden by trust score)
    const allowed = Array.isArray(rules.allowedCategories)
      ? rules.allowedCategories.map((c: any) => String(c || "").trim().toLowerCase())
      : [];
    const productCat = String(product.category || "").trim().toLowerCase();

    if (!allowed.includes(productCat)) {
      decision = "blocked";
      reason = `Blocked — Category '${product.category}' not in merchant's allow-list (agent trust ${agentTrust.score}, ${trustTier})`;
    } 
    // 3. Check per-order cap (HARD LIMIT - NEVER overridden by trust score)
    else if (requestedAmount > rules.maxOrderAmount) {
      // Query catalog for real same-category items under the cap
      const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
      const q = query(
        catalogRef,
        where("category", "==", product.category)
      );
      const altSnaps = await getDocs(q);
      
      let bestMatch: any = null;
      let minDiff = Infinity;
      altSnaps.forEach(snap => {
        const altData: any = { id: snap.id, ...snap.data() };
        if (altData.price <= rules.maxOrderAmount && altData.id !== productId) {
          const diff = Math.abs(requestedAmount - altData.price);
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = altData;
          }
        }
      });

      if (!bestMatch) {
        decision = "blocked";
        reason = `Blocked — Exceeds per-order limit of ₹${rules.maxOrderAmount}, no in-budget alternative found (agent trust ${agentTrust.score}, ${trustTier})`;
      } else {
        decision = "recovered";
        reason = `Recovery offer — Requested amount ₹${requestedAmount} exceeds per-order cap of ₹${rules.maxOrderAmount} (agent trust ${agentTrust.score}, ${trustTier}). Suggested alternative: ${bestMatch.name} (₹${bestMatch.price})`;
        recoveryProduct = bestMatch;
      }
    } 
    else {
      // 4. Check daily spend limit (HARD LIMIT - NEVER overridden by trust score)
      if (todaySpent + requestedAmount > rules.dailySpendLimit) {
        decision = "blocked";
        reason = `Blocked — Would exceed daily spend limit of ₹${rules.dailySpendLimit} (today: ₹${todaySpent}, requested: ₹${requestedAmount}) (agent trust ${agentTrust.score}, ${trustTier})`;
      } 
      // 5. Check approval threshold (ADAPTIVE - modulated by agent trust score)
      else if (requestedAmount > effectiveThreshold) {
        decision = "escalated";
        if (isStrict) {
          reason = `Escalated — agent trust ${agentTrust.score} (${trustTier}), all purchases require approval`;
        } else {
          reason = `Escalated — agent trust ${agentTrust.score} (${trustTier}), above ₹${effectiveThreshold} approval threshold, awaiting merchant review`;
        }
      } 
      // 6. Approve (Within all limits and approval threshold)
      else {
        decision = "approved";
        if (isRelaxed && requestedAmount > rules.approvalThreshold) {
          reason = `Approved — agent trust ${agentTrust.score} (${trustTier}), relaxed threshold applied (₹${effectiveThreshold})`;
        } else {
          reason = `Approved — agent trust ${agentTrust.score} (${trustTier}), within policy limits`;
        }
      }
    }
  }

  // 7. Hash Chaining & Writing Transaction Document
  const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
  const lastTxnQuery = query(txnsRef, orderBy("time", "desc"), limit(1));
  const lastTxnSnap = await getDocs(lastTxnQuery);
  
  let prevHash = GENESIS_HASH;
  if (!lastTxnSnap.empty) {
    prevHash = lastTxnSnap.docs[0].data().hash || GENESIS_HASH;
  }

  const timestamp = new Date().toISOString();
  const txnData: any = {
    time: timestamp,
    timestamp,
    agent: agentId,
    agentId,
    product: product.name,
    productId,
    amount: requestedAmount,
    requestedAmount,
    decision,
    reason,
    agentTrustScore: agentTrust.score,
    agentTrustTier: trustTier,
    effectiveThreshold,
  };
  
  if (decision === "recovered" && recoveryProduct) {
    txnData.savedAmount = requestedAmount - recoveryProduct.price;
    txnData.alternativeProduct = recoveryProduct.name;
    txnData.alternativePrice = recoveryProduct.price;
  }
  
  if (decision === "approved") {
    try {
      const order = await createRazorpayOrder(requestedAmount, product.name);
      txnData.orderId = order.id;
      txnData.status = "completed";
      txnData.razorpayOrderId = order.id;
    } catch (err: any) {
      txnData.status = "failed";
      txnData.errorReason = err.message || "Razorpay API error";
    }
  } else if (decision === "escalated") {
    txnData.status = "pending";
  } else if (decision === "blocked") {
    txnData.status = "denied";
  }

  const hash = computeTxnHash(prevHash, txnData);

  const finalTxn = {
    ...txnData,
    prevHash,
    hash
  };

  const docRef = await addDoc(txnsRef, finalTxn);

  // 8. Update daily spend document if approved
  if (decision === "approved") {
    const newSpent = todaySpent + requestedAmount;
    await setDoc(dailySpendRef, {
      agentId,
      date: dateKey,
      amount: newSpent,
      count: todayCount + 1,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  // 9. Update Agent Trust Score based on transaction outcome
  let updatedTrust = agentTrust;
  try {
    if (decision === "approved") {
      const eventType = isRecoveryAcceptance ? "accepted_recovery" : "approved";
      updatedTrust = await updateAgentTrustOnTransaction(merchantId, agentId, eventType);
    } else if (decision === "blocked") {
      updatedTrust = await updateAgentTrustOnTransaction(merchantId, agentId, "blocked");
    }
  } catch (err) {
    console.error(`Failed to update agent trust score for ${agentId}:`, err);
  }

  return {
    decision,
    reason,
    recoveryProduct,
    status: txnData.status,
    orderId: txnData.orderId,
    razorpayOrderId: txnData.razorpayOrderId,
    errorReason: txnData.errorReason,
    transactionId: docRef.id,
    time: txnData.time,
    hash,
    prevHash,
    agentTrustScore: updatedTrust.score,
    agentTrustTier: getTrustTier(updatedTrust.score),
    effectiveThreshold,
  };
}
