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
import { GENESIS_HASH, computeOutcomeUpdateHash, getMerchantTodayApprovedSpend, withChainLock } from "../services/firewall";

export const handleResolve: RequestHandler = async (req, res): Promise<any> => {
  try {
    const { transactionId, approve } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: "Missing transactionId" });
    }

    const txRef = doc(db, "merchants/demo_merchant/transactions", transactionId);
    const txnsRef = collection(db, "merchants/demo_merchant/transactions");

    const existingUpdatesQuery = query(
      txnsRef,
      where("type", "==", "outcome_update"),
      where("relatedTransactionId", "==", transactionId),
      limit(1)
    );

    // Fetch transaction data and existing resolution check in parallel
    const [txSnap, existingUpdatesSnap] = await Promise.all([
      getDoc(txRef),
      getDocs(existingUpdatesQuery),
    ]);

    if (!txSnap.exists()) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const txData = txSnap.data();
    if (txData.decision !== "escalated") {
      return res.status(400).json({ error: "Transaction is not an escalated request" });
    }

    if (!existingUpdatesSnap.empty) {
      return res.status(400).json({ error: "Transaction has already been resolved" });
    }

    let order: any = null;
    const sideEffectPromises: Promise<any>[] = [];

    if (approve) {
      const orderAmount = Number(txData.amount ?? txData.requestedAmount ?? 0);
      const orderProduct = txData.product ?? txData.productId ?? "Goods";
      const rulesRef = doc(db, "merchants/demo_merchant/rules/current");

      // Parallelize checking rules, today's spend, and initiating Razorpay order creation
      const [rulesSnap, liveTodaySpent, orderResult] = await Promise.all([
        getDoc(rulesRef),
        getMerchantTodayApprovedSpend("demo_merchant"),
        createRazorpayOrder(orderAmount, orderProduct).catch((err: any) => {
          console.error("Razorpay order creation error during approval:", err);
          return null;
        }),
      ]);

      const rules = rulesSnap.exists() ? rulesSnap.data() : null;
      const dailySpendLimit = Number(rules?.dailySpendLimit || 0);

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

      order = orderResult;

      // Update daily spend document & agent trust score in parallel
      const dateKey = new Date().toISOString().split("T")[0];
      const agentId = txData.agent || txData.agentId || "agt_live_7f3c9e";
      const dailySpendRef = doc(db, `merchants/demo_merchant/dailySpend/${agentId}_${dateKey}`);

      sideEffectPromises.push(
        getDoc(dailySpendRef).then(async (spendSnap) => {
          const currentSpent = spendSnap.exists() ? Number(spendSnap.data().amount || 0) : 0;
          const currentCount = spendSnap.exists() ? Number(spendSnap.data().count || 0) : 0;
          await setDoc(
            dailySpendRef,
            {
              agentId,
              date: dateKey,
              amount: currentSpent + orderAmount,
              count: currentCount + 1,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }).catch((err) => console.error("Error updating daily spend:", err))
      );

      sideEffectPromises.push(
        updateAgentTrustOnTransaction("demo_merchant", agentId, "approved").catch((err) =>
          console.error("Failed to update agent trust on approval:", err)
        )
      );
    } else {
      // Update agent trust score for denied escalation (-5)
      const agentId = txData.agent || txData.agentId || "agt_live_7f3c9e";
      sideEffectPromises.push(
        updateAgentTrustOnTransaction("demo_merchant", agentId, "denied_escalation").catch((err) =>
          console.error("Failed to update agent trust on denial:", err)
        )
      );
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
      agent: txData.agent || txData.agentId || "agt_live_7f3c9e",
      agentId: txData.agent || txData.agentId || "agt_live_7f3c9e",
      product: txData.product || txData.productId || "Item",
      amount: Number(txData.amount ?? txData.requestedAmount ?? 0),
    };

    if (order?.id) {
      outcomeUpdateData.orderId = order.id;
      outcomeUpdateData.razorpayOrderId = order.id;
    }

    const [chainResult] = await Promise.all([
      withChainLock(async () => {
        const lastTxnQuery = query(txnsRef, orderBy("time", "desc"), limit(1));
        const lastTxnSnap = await getDocs(lastTxnQuery);
        let prev = GENESIS_HASH;
        let lastTimeMs = 0;
        if (!lastTxnSnap.empty) {
          const lastDoc = lastTxnSnap.docs[0].data();
          prev = lastDoc.hash || GENESIS_HASH;
          const lastTimeStr = lastDoc.timestamp || lastDoc.time;
          if (lastTimeStr) {
            lastTimeMs = new Date(lastTimeStr).getTime();
          }
        }

        const nowMs = Math.max(Date.now(), lastTimeMs + 1);
        const monotonicTimestamp = new Date(nowMs).toISOString();
        outcomeUpdateData.timestamp = monotonicTimestamp;
        outcomeUpdateData.time = monotonicTimestamp;
        outcomeUpdateData.prevHash = prev;

        // Compute hash strictly using immutable fields
        const computedHash = computeOutcomeUpdateHash(prev, {
          timestamp: monotonicTimestamp,
          relatedTransactionId: transactionId,
          outcome,
          reason,
        });
        outcomeUpdateData.hash = computedHash;

        // Create NEW document in transactions collection.
        // The original escalated document (txRef) is NEVER mutated!
        const createdRef = await addDoc(txnsRef, outcomeUpdateData);
        return { docRef: createdRef, hash: computedHash };
      }),
      Promise.all(sideEffectPromises),
    ]);

    return res.json({
      success: true,
      outcomeUpdateId: chainResult.docRef.id,
      hash: chainResult.hash,
      orderId: order?.id,
    });
  } catch (err) {
    console.error("Error resolving transaction:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
