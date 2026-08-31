import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where, addDoc } from "firebase/firestore";
import * as crypto from "crypto";

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

import { createRazorpayOrder } from "./razorpay";

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

  let decision: string;
  let reason: string;
  let recoveryProduct: any = undefined;

  if (overrideDecision) {
    decision = overrideDecision;
    reason = overrideDecision === "approved" ? "Approved by merchant" : "Manually denied by merchant";
  } else {
    // 2. Check category
    if (!rules.allowedCategories.includes(product.category)) {
      decision = "blocked";
      reason = `Category '${product.category}' not in merchant's allow-list`;
    } 
    // 3. Check per-order cap
    else if (requestedAmount > rules.maxOrderAmount) {
      // Query catalog for recovery
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
        if (altData.price <= rules.maxOrderAmount) {
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
        reason = `Requested amount exceeds ₹${rules.maxOrderAmount} limit`;
        recoveryProduct = bestMatch;
      }
    } 
    else {
      // 4. Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      
      // We query transactions and filter in-memory to avoid needing composite indexes
      const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
      const qTxns = query(
        txnsRef,
        where("agent", "==", agentId)
      );
      const txnsSnap = await getDocs(qTxns);
      
      let todaySpent = 0;
      txnsSnap.forEach(snap => {
        const data = snap.data();
        if (data.decision === "approved" && data.time >= todayIso) {
          todaySpent += data.amount || 0;
        }
      });

      if (todaySpent + requestedAmount > rules.dailySpendLimit) {
        decision = "blocked";
        reason = `Would exceed daily spend limit of ₹${rules.dailySpendLimit}`;
      } 
      // 5. Check approval threshold
      else if (requestedAmount > rules.approvalThreshold) {
        decision = "escalated";
        reason = `Above ₹${rules.approvalThreshold} approval threshold, awaiting merchant review`;
      } 
      // 6. Approve
      else {
        decision = "approved";
        reason = "Within all policy limits";
      }
    }
  }

  // 7. Write transaction & Hash Chaining
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
  }

  const hashString = prevHash + JSON.stringify(txnData);
  const hash = crypto.createHash('sha256').update(hashString).digest('hex');

  const finalTxn = {
    ...txnData,
    prevHash,
    hash
  };

  const docRef = await addDoc(txnsRef, finalTxn);

  return {
    decision,
    reason,
    recoveryProduct,
    status: txnData.status,
    razorpayOrderId: txnData.razorpayOrderId,
    errorReason: txnData.errorReason,
    transactionId: docRef.id
  };
}
