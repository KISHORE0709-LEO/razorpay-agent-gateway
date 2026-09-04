import { Request, Response } from "express";
import { evaluatePurchaseRequest } from "../services/firewall";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

interface ParsedLLM {
  productId?: string | null;
  category?: string | null;
  budget?: number | null;
}

async function extractWithGroq(message: string, catalog: any[]): Promise<ParsedLLM | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `
You are an AI shopping agent. The user is asking to purchase a product.
User message: "${message}"

Here is the merchant's catalog:
${JSON.stringify(catalog.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })), null, 2)}

Instructions:
1. Extract any mentioned budget (as a number in INR).
2. Extract the intended category.
3. Match the request against the catalog to pick the best matching product ID.
4. Output STRICT JSON with keys: "productId" (string or null), "category" (string or null), "budget" (number or null). Do not include extra text or markdown formatting.
`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "You are a shopping assistant that extracts purchase intent and matches catalog products. Respond ONLY in raw valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      console.warn("Groq request failed with status:", res.status);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (err) {
    console.warn("Error calling Groq LLM:", err);
    return null;
  }
}

function fallbackCatalogMatch(message: string, catalog: any[]): ParsedLLM {
  const lower = message.toLowerCase();
  
  // Extract budget
  const budgetMatch = lower.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  let budget: number | undefined = undefined;
  if (budgetMatch) {
    const num = Number(budgetMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 100) budget = num;
  }

  // 1. Check direct product keyword match
  for (const prod of catalog) {
    const nameLower = prod.name.toLowerCase();
    const words = nameLower.split(/\s+/).filter((w: string) => w.length > 3);
    if (lower.includes(nameLower) || words.some((w: string) => lower.includes(w))) {
      return { productId: prod.id, category: prod.category, budget: budget ?? prod.price };
    }
  }

  // 2. Check category match
  const categories = ["Electronics", "Fashion", "Home & Kitchen", "Groceries"];
  for (const cat of categories) {
    if (lower.includes(cat.toLowerCase())) {
      const itemsInCat = catalog.filter(p => p.category.toLowerCase() === cat.toLowerCase());
      if (itemsInCat.length > 0) {
        // If budget specified, find item closest to or under budget
        if (budget) {
          const under = itemsInCat.filter(p => p.price <= budget!).sort((a, b) => b.price - a.price);
          if (under.length > 0) return { productId: under[0].id, category: cat, budget };
        }
        return { productId: itemsInCat[0].id, category: cat, budget: budget ?? itemsInCat[0].price };
      }
    }
  }

  return { productId: null, category: null, budget };
}

export const handleChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, merchantId, agentId } = req.body;

    if (!message || !merchantId || !agentId) {
      res.status(400).json({ error: "Missing required fields (message, merchantId, agentId)" });
      return;
    }

    // 1. Fetch live catalog from Firestore
    const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
    const catalogSnap = await getDocs(catalogRef);
    const catalog = catalogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (catalog.length === 0) {
      res.status(404).json({ error: "Merchant catalog is empty" });
      return;
    }

    // 2. Try LLM extraction (Groq / Gemini) with semantic fallback
    let parsed: ParsedLLM | null = await extractWithGroq(message, catalog);
    if (!parsed || !parsed.productId) {
      parsed = fallbackCatalogMatch(message, catalog);
    }

    if (!parsed.productId) {
      res.json({
        decision: "blocked",
        reason: `Could not match any catalog item for "${message}". Try requesting earbuds, shoes, rice, kettle, watch, etc.`,
      });
      return;
    }

    const product: any = catalog.find((p: any) => p.id === parsed.productId);
    if (!product) {
      res.json({
        decision: "blocked",
        reason: `Matched product '${parsed.productId}' was not found in the catalog.`,
      });
      return;
    }

    // 3. Evaluate the request using the real Firewall Decision Engine
    // Note: If the user explicitly requested a higher budget/amount than the product's price,
    // we use that requested amount, otherwise the product's price.
    const requestedAmount = (parsed.budget && parsed.budget > product.price) ? parsed.budget : product.price;
    const result = await evaluatePurchaseRequest(merchantId, agentId, product.id, requestedAmount);
    
    // Return evaluated decision along with parsed product info
    res.json({
      ...result,
      parsedProduct: product,
      requestedAmount,
    });
  } catch (error: any) {
    console.error("Error in chat handling:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
