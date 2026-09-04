import { Request, Response } from "express";
import { db } from "../firebase";
import { doc, getDocFromServer, setDoc } from "firebase/firestore";

export const handleGetRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req.query.merchantId as string) || "demo_merchant";
    const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
    const snap = await getDocFromServer(rulesRef);
    if (!snap.exists()) {
      res.status(404).json({ error: "Rules document not found in Firestore" });
      return;
    }
    res.json(snap.data());
  } catch (error: any) {
    console.error("Error fetching fresh rules from Firestore:", error);
    res.status(500).json({ error: error.message || "Failed to fetch rules" });
  }
};

export const handleSaveRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId = "demo_merchant", rules } = req.body;
    if (!rules) {
      res.status(400).json({ error: "Missing rules payload" });
      return;
    }

    const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
    const dataToSave = {
      maxOrderAmount: Number(rules.maxOrderAmount ?? rules.maxOrder),
      dailySpendLimit: Number(rules.dailySpendLimit ?? rules.dailyLimit),
      allowedCategories: Array.isArray(rules.allowedCategories) 
        ? rules.allowedCategories 
        : (rules.categories || []),
      approvalThreshold: Number(rules.approvalThreshold ?? rules.approvalAbove),
      maxDiscountPercent: Number(rules.maxDiscountPercent ?? rules.maxDiscount),
      updatedAt: new Date().toISOString()
    };

    // 1. Commit write to Firestore
    await setDoc(rulesRef, dataToSave, { merge: true });

    // 2. Read back from server to confirm write completed
    const verifySnap = await getDocFromServer(rulesRef);
    if (!verifySnap.exists()) {
      throw new Error("Failed to verify saved rules in Firestore");
    }

    res.json({
      success: true,
      rules: verifySnap.data()
    });
  } catch (error: any) {
    console.error("Error persisting rules to Firestore:", error);
    res.status(500).json({ error: error.message || "Failed to save rules to Firestore" });
  }
};
