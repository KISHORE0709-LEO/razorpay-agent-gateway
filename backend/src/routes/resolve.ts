import { RequestHandler } from "express";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { createRazorpayOrder } from "../services/razorpay";
import { updateAgentTrustOnTransaction } from "../services/agentTrust";
import { GENESIS_HASH, computeOutcomeUpdateHash, getMerchantTodayApprovedSpend } from "../services/firewall";

export const handleResolve: RequestHandler = async (req, res): Promise<any> => {
  try {
    const { transactionId, approve } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Missing transactionId" });
    }

    const txRef = doc(db, "merchants/demo_merchant/transactions", transactionId);
    const txSnap = await getDoc(txRef);

    if (!txSnap.exists()) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const txData = txSnap.data();
    if (txData.decision !== "escalated") {
      return res.status(400).json({ error: "Transaction is not an escalated request" });
    }

    // Check if this transaction already has an outcome_update
    const txnsRef = collection(db, "merchants/demo_merchant/transactions");
    const existingUpdatesQuery = query(
      txnsRef,
      where("type", "==", "outcome_update"),
      where("relatedTransactionId", "==", transactionId)
    );
    const existingUpdatesSnap = await getDocs(existingUpdatesQuery);
    if (!existingUpdatesSnap.empty) {
      return res.status(400).json({ error: "Transaction has already been resolved" });
    }

    // Get the most recent transaction document in the chain to obtain prevHash
    const lastTxnQuery = query(txnsRef, orderBy("time", "desc"), limit(1));
    const lastTxnSnap = await getDocs(lastTxnQuery);
    let prevHash = GENESIS_HASH;
    if (!lastTxnSnap.empty) {
      prevHash = lastTxnSnap.docs[0].data().hash || GENESIS_HASH;
    }

    const timestamp = new Date().toISOString();
    let order: any = null;

    if (approve) {
      const orderAmount = Number(txData.amount ?? txData.requestedAmount ?? 0);

      // Re-check daily spend limit at the moment of approval
      const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
      const rulesSnap = await getDoc(rulesRef);
      const rules = rulesSnap.exists() ? rulesSnap.data() : null;
      const dailySpendLimit = Number(rules?.dailySpendLimit || 0);

      const liveTodaySpent = await getMerchantTodayApprovedSpend("demo_merchant");

      if (dailySpendLimit > 0 && liveTodaySpent + orderAmount > dailySpendLimit) {
        return res.status(400).json({
          error: `Would exceed daily spend limit of ₹${dailySpendLimit}`,
          reason: `Would exceed daily spend limit of ₹${dailySpendLimit}`,
          blocked: true,
          liveTodaySpent,
          orderAmount,
          dailySpendLimit,
        });
      }

      try {
        const orderProduct = txData.product ?? txData.productId ?? "Goods";
        order = await createRazorpayOrder(orderAmount, orderProduct);

        // Update daily spend document
        const dateKey = new Date().toISOString().split("T")[0];
        const agentId = txData.agent || txData.agentId || "agt_live_7f3c9e";
        const dailySpendRef = doc(db, `merchants/demo_merchant/dailySpend/${agentId}_${dateKey}`);
        const spendSnap = await getDoc(dailySpendRef);
        const currentSpent = spendSnap.exists() ? Number(spendSnap.data().amount || 0) : 0;
        const currentCount = spendSnap.exists() ? Number(spendSnap.data().count || 0) : 0;
        await setDoc(
          dailySpendRef,
          {
            agentId,
            date: dateKey,
            amount: currentSpent + orderAmount,
            count: currentCount + 1,
            updatedAt: timestamp,
          },
          { merge: true }
        );
      } catch (err: any) {
        console.error("Razorpay order creation error during approval:", err);
      }

      // Update agent trust score for approved escalation (+2)
      try {
        const agentId = txData.agent || txData.agentId || "agt_live_7f3c9e";
        await updateAgentTrustOnTransaction("demo_merchant", agentId, "approved");
      } catch (err) {
        console.error("Failed to update agent trust on approval:", err);
      }
    } else {
      // Update agent trust score for denied escalation (-5)
      try {
        const agentId = txData.agent || txData.agentId || "agt_live_7f3c9e";
        await updateAgentTrustOnTransaction("demo_merchant", agentId, "denied_escalation");
      } catch (err) {
        console.error("Failed to update agent trust on denial:", err);
      }
    }

    const outcome: "approved" | "denied" = approve ? "approved" : "denied";
    const reason = approve
      ? (order ? `Approved by merchant (Razorpay Order: ${order.id})` : "Approved by merchant")
      : "Manually denied by merchant";

    const outcomeUpdateData: any = {
      type: "outcome_update",
      relatedTransactionId: transactionId,
      outcome,
      reason,
      timestamp,
      time: timestamp, // for ordering alongside standard transactions
      prevHash,
      agent: txData.agent || txData.agentId || "agt_live_7f3c9e",
      agentId: txData.agent || txData.agentId || "agt_live_7f3c9e",
      product: txData.product || txData.productId || "Item",
      amount: Number(txData.amount ?? txData.requestedAmount ?? 0),
    };

    if (order?.id) {
      outcomeUpdateData.orderId = order.id;
      outcomeUpdateData.razorpayOrderId = order.id;
    }

    // Compute hash strictly using immutable fields
    const hash = computeOutcomeUpdateHash(prevHash, {
      timestamp,
      relatedTransactionId: transactionId,
      outcome,
      reason,
    });

    outcomeUpdateData.hash = hash;

    // Create NEW document in transactions collection.
    // The original escalated document (txRef) is NEVER mutated!
    const docRef = await addDoc(txnsRef, outcomeUpdateData);

    return res.json({
      success: true,
      outcomeUpdateId: docRef.id,
      hash,
      orderId: order?.id,
    });
  } catch (err) {
    console.error("Error resolving transaction:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
