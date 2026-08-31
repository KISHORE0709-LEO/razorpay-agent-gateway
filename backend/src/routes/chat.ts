import { Request, Response } from "express";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { evaluatePurchaseRequest } from "../services/firewall";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const ai = new GoogleGenAI({}); // will use GEMINI_API_KEY from env

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    productId: {
      type: Type.STRING,
      description: "The ID of the product the user wants to buy. Example: 'prod_1'. Leave null if no matching product is found.",
      nullable: true,
    },
    category: {
      type: Type.STRING,
      description: "The intended category (e.g. 'Electronics', 'Fashion', 'Groceries', 'Home & Kitchen').",
      nullable: true,
    },
    budget: {
      type: Type.NUMBER,
      description: "The maximum budget the user specified. Null if none.",
      nullable: true,
    },
  },
};

export const handleChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, merchantId, agentId } = req.body;

    if (!message || !merchantId || !agentId) {
      res.status(400).json({ error: "Missing required fields (message, merchantId, agentId)" });
      return;
    }

    // 1. Fetch catalog
    const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
    const catalogSnap = await getDocs(catalogRef);
    const catalog = catalogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Call Gemini to parse the message
    const prompt = `
You are an AI shopping agent. The user is asking you to buy a product.
User message: "${message}"

Here is the merchant's catalog:
${JSON.stringify(catalog, null, 2)}

Instructions:
Extract the intended product category and max budget if present.
Then match the request against the catalog to pick a specific product ID.
If the user specifies a budget, pick the most expensive matching product that is within the budget, or if no such product exists, pick the cheapest product in the category overall.
If the user doesn't specify a budget, pick the product that best matches their description.
Return the extracted productId, category, and budget.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const parsed = JSON.parse(response.text || "{}");

    if (!parsed.productId) {
       res.json({ decision: "blocked", reason: "I couldn't find a matching item in the catalog. Try a different request." });
       return;
    }

    const product: any = catalog.find((p: any) => p.id === parsed.productId);
    if (!product) {
       res.json({ decision: "blocked", reason: "I couldn't find a matching item in the catalog. Try a different request." });
       return;
    }

    // 3. Evaluate the request
    const result = await evaluatePurchaseRequest(merchantId, agentId, parsed.productId, product.price);
    
    // We send back the evaluated result, but with the product info attached so frontend knows what we tried to buy
    res.json({ ...result, parsedProduct: product });
  } catch (error: any) {
    console.error("Error in chat parsing:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
