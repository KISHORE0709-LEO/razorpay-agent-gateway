import { RequestHandler } from "express";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { createRazorpayOrder } from "../services/razorpay";

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
    if (txData.status !== "pending") {
      return res.status(400).json({ error: "Transaction is not pending" });
    }

    if (approve) {
      try {
        const order = await createRazorpayOrder(txData.amount, txData.product);
        await updateDoc(txRef, {
          decision: "approved",
          status: "completed",
          orderId: order.id,
          razorpayOrderId: order.id,
          reason: "Approved by merchant",
          resolvedAt: new Date().toISOString(),
        });

        // Update daily spend document
        const dateKey = new Date().toISOString().split("T")[0];
        const agentId = txData.agent || "agt_live_7f3c9e";
        const dailySpendRef = doc(db, `merchants/demo_merchant/dailySpend/${agentId}_${dateKey}`);
        const spendSnap = await getDoc(dailySpendRef);
        const currentSpent = spendSnap.exists() ? Number(spendSnap.data().amount || 0) : 0;
        const currentCount = spendSnap.exists() ? Number(spendSnap.data().count || 0) : 0;
        await setDoc(dailySpendRef, {
          agentId,
          date: dateKey,
          amount: currentSpent + Number(txData.amount || 0),
          count: currentCount + 1,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

      } catch (err: any) {
        await updateDoc(txRef, {
          status: "failed",
          errorReason: err.message || "Razorpay API error",
          resolvedAt: new Date().toISOString(),
        });
      }
    } else {
      await updateDoc(txRef, {
        decision: "blocked",
        status: "denied",
        reason: "Manually denied by merchant",
        resolvedAt: new Date().toISOString(),
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error resolving transaction:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
