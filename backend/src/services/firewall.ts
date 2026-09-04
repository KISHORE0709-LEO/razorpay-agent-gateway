import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where, addDoc } from "firebase/firestore";
import * as crypto from "crypto";
import { createRazorpayOrder } from "./razorpay";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export function computeTxnHash(prevHash: string, data: { time: string; agent: string; product: string; amount: number; decision: string; reason: string }): string {
  const payload = `${prevHash}|${data.time}|${data.agent}|${data.product}|${data.amount}|${data.decision}|${data.reason}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function evaluatePurchaseRequest(
  merchantId: string, 
  agentId: string, 
  productId: string, 
  requestedAmount: number,
  overrideDecision?: "approved" | "blocked"
) {
  // 1. Fetch rules and product
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const productRef = doc(db, `merchants/${merchantId}/catalog/${productId}`);
  
  const [rulesSnap, productSnap] = await Promise.all([
    getDoc(rulesRef),
    getDoc(productRef)
  ]);

  if (!rulesSnap.exists()) {
    throw new Error(`Rules not found for merchant ${merchantId}`);
  }
  if (!productSnap.exists()) {
    throw new Error(`Product not found: ${productId}`);
  }

  const rules = rulesSnap.data();
  const product = productSnap.data();

  let decision: "approved" | "recovered" | "escalated" | "blocked";
  let reason: string;
  let recoveryProduct: any = undefined;

  const dateKey = new Date().toISOString().split("T")[0];
  const dailySpendDocId = `${agentId}_${dateKey}`;
  const dailySpendRef = doc(db, `merchants/${merchantId}/dailySpend/${dailySpendDocId}`);
  const dailySpendSnap = await getDoc(dailySpendRef);
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
    // 2. Check category allow-list (FIRST)
    if (!rules.allowedCategories.includes(product.category)) {
      decision = "blocked";
      reason = `Category '${product.category}' not in merchant's allow-list`;
    } 
    // 3. Check per-order cap (SECOND)
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
        reason = `Exceeds per-order limit of ₹${rules.maxOrderAmount}, no in-budget alternative found`;
      } else {
        decision = "recovered";
        reason = `Requested amount ₹${requestedAmount} exceeds per-order cap of ₹${rules.maxOrderAmount}. Suggested alternative: ${bestMatch.name} (₹${bestMatch.price})`;
        recoveryProduct = bestMatch;
      }
    } 
    else {
      // 4. Check daily spend limit (THIRD)
      if (todaySpent + requestedAmount > rules.dailySpendLimit) {
        decision = "blocked";
        reason = `Would exceed daily spend limit of ₹${rules.dailySpendLimit} (today: ₹${todaySpent}, requested: ₹${requestedAmount})`;
      } 
      // 5. Check approval threshold (FOURTH)
      else if (requestedAmount > rules.approvalThreshold) {
        decision = "escalated";
        reason = `Above ₹${rules.approvalThreshold} approval threshold, awaiting merchant review`;
      } 
      // 6. Approve (ELSE)
      else {
        decision = "approved";
        reason = "Within all policy limits";
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

  const txnData: any = {
    time: new Date().toISOString(),
    agent: agentId,
    product: product.name,
    amount: requestedAmount,
    decision,
    reason,
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

  return {
    decision,
    reason,
    recoveryProduct,
    status: txnData.status,
    orderId: txnData.orderId,
    razorpayOrderId: txnData.razorpayOrderId,
    errorReason: txnData.errorReason,
    transactionId: docRef.id
  };
}
