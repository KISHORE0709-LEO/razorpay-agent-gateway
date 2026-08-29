import { Request, Response } from "express";
import { evaluatePurchaseRequest } from "../services/firewall";

export const handleEvaluate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, agentId, productId, requestedAmount, overrideDecision } = req.body;

    if (!merchantId || !agentId || !productId || typeof requestedAmount !== 'number') {
      res.status(400).json({ error: "Missing or invalid required fields (merchantId, agentId, productId, requestedAmount)" });
      return;
    }

    const result = await evaluatePurchaseRequest(merchantId, agentId, productId, requestedAmount, overrideDecision);
    res.json(result);
  } catch (error: any) {
    console.error("Error evaluating purchase request:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
