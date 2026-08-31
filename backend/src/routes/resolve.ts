import { RequestHandler } from "express";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
          status: "completed",
          orderId: order.id,
          razorpayOrderId: order.id,
        });
      } catch (err: any) {
        await updateDoc(txRef, {
          status: "failed",
          errorReason: err.message || "Razorpay API error",
        });
      }
    } else {
      await updateDoc(txRef, {
        status: "denied",
        reason: "Manually denied by merchant",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error resolving transaction:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
