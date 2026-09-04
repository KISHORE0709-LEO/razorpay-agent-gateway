import { Request, Response } from "express";
import { evaluatePurchaseRequest } from "../services/firewall";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import Fuse from "fuse.js";

interface ParsedIntent {
  isPurchaseIntent: boolean;
  searchQuery?: string | null;
  category?: string | null;
  budget?: number | null;
  conversationalReply?: string | null;
}

function buildProductKeywords(p: any): string {
  const name = (p.name || "").toLowerCase();
  const cat = (p.category || "").toLowerCase();
  const kw = [name, cat];
  if (name.includes("watch")) kw.push("smartwatch", "smart watch", "fitness watch", "wearable", "wrist watch");
  if (name.includes("earbuds")) kw.push("earbuds", "earphones", "ear buds", "airpods", "tws", "wireless earphones");
  if (name.includes("headphones")) kw.push("headphones", "headset", "over ear headphones");
  if (name.includes("shoes")) kw.push("running shoes", "shoes", "sneakers", "footwear", "trainers", "sports shoes");
  if (name.includes("shirt")) kw.push("shirt", "casual shirt", "tshirt", "t-shirt", "clothing", "apparel");
  if (name.includes("bottle")) kw.push("water bottle", "flask", "sipper", "bottle");
  if (name.includes("tea")) kw.push("green tea", "tea", "organic tea", "beverage");
  if (name.includes("mug")) kw.push("coffee mug", "mug", "cup", "coffee cups");
  if (name.includes("keyboard")) kw.push("keyboard", "gaming keyboard", "mechanical keyboard");
  if (name.includes("belt")) kw.push("leather belt", "belt", "formal belt");
  return kw.join(" ");
}

async function extractWithGroq(message: string, catalog: any[]): Promise<ParsedIntent | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const productNames = catalog.map(p => `- "${p.name}" (Category: ${p.category})`).join("\n");

  const prompt = `Available products in catalog:
${productNames}

User message: "${message}"

Instructions:
1. Determine if this message has purchase intent (e.g. wants to buy, order, or search for an item in the store).
   - If NOT purchase intent (e.g. "hi", "hello", "how are you?", "how does this work?", general greetings/questions):
     Set "isPurchaseIntent" to false, and provide a polite helpful response in "conversationalReply".
   - If purchase intent (e.g. "Buy a smartwatch for 799", "Buy running shoes for 1200", "buy wireless earbuds under 2000", "badminton racket under 2000", "buy me a car"):
     Set "isPurchaseIntent" to true.
     Extract "searchQuery": the target product keywords or closest product title from available catalog products (map casual terms: 'smartwatch' -> 'Smart Fitness Watch', 'earphones' -> 'Wireless Bluetooth Earbuds', 'sneakers' -> 'Running Shoes').
     Extract "budget": numeric amount in INR if mentioned (e.g. 799, 1200, 2000, 8000), else null.
     Extract "category": category if identified, else null.

Output STRICT raw JSON with NO markdown formatting:
{
  "isPurchaseIntent": boolean,
  "searchQuery": string | null,
  "budget": number | null,
  "category": string | null,
  "conversationalReply": string | null
}`;

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
          { role: "system", content: "You are an AI purchase intent parser for an enterprise shopping agent. Output only valid raw JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
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

function fallbackIntentParse(message: string): ParsedIntent {
  const trimmed = message.trim().toLowerCase();

  // Check greetings / conversational phrases
  const greetings = ["hi", "hello", "hey", "howdy", "good morning", "good evening", "how does this work", "help", "who are you"];
  if (greetings.some(g => trimmed === g || trimmed.startsWith(g + " "))) {
    return {
      isPurchaseIntent: false,
      conversationalReply: "Hello! I am your AI Buyer. Tell me what product you'd like to buy (e.g. 'buy wireless earbuds under 2000'), and I will check it against our firewall rules."
    };
  }

  // Extract budget
  const budgetMatch = trimmed.match(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i);
  let budget: number | null = null;
  if (budgetMatch) {
    const num = Number(budgetMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 50) budget = num;
  }

  // Clean search query
  let searchQuery = trimmed
    .replace(/\b(buy|order|purchase|get|find|need|want|me|a|an|the|for|under|around|below|within|price)\b/gi, " ")
    .replace(/[₹\d,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    isPurchaseIntent: true,
    searchQuery: searchQuery || trimmed,
    budget,
    category: null,
    conversationalReply: null
  };
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
    const catalog = catalogSnap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        imageUrl: data.imageUrl || `https://picsum.photos/seed/${doc.id}/300/300`
      };
    });

    if (catalog.length === 0) {
      res.status(404).json({ error: "Merchant catalog is empty" });
      return;
    }

    // 2. Extract intent using Groq with deterministic rule fallback
    let intent: ParsedIntent | null = await extractWithGroq(message, catalog);
    if (!intent || typeof intent.isPurchaseIntent !== "boolean") {
      intent = fallbackIntentParse(message);
    }

    // 3. Handle non-purchase conversational messages gracefully
    // Do NOT run the firewall or write any transaction/audit records
    if (!intent.isPurchaseIntent) {
      res.json({
        decision: "conversational",
        message: intent.conversationalReply || "Hi! I am your AI Buyer. Tell me what product you'd like to purchase and I will check it against our firewall rules."
      });
      return;
    }

    // 4. Enrich catalog with semantic keywords
    const enrichedCatalog = catalog.map(p => ({
      ...p,
      keywords: buildProductKeywords(p)
    }));

    // 5. Deterministic Fuzzy Matching with Fuse.js
    const fuse = new Fuse(enrichedCatalog, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "keywords", weight: 0.4 },
        { name: "category", weight: 0.1 }
      ],
      includeScore: true,
      threshold: 0.45,
      ignoreLocation: true
    });

    const rawClean = message
      .toLowerCase()
      .replace(/\b(buy|order|purchase|get|find|need|want|me|a|an|the|for|under|around|below|within|price)\b/gi, " ")
      .replace(/[₹\d,]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const extractedClean = (intent.searchQuery || "")
      .toLowerCase()
      .replace(/\b(buy|order|purchase|get|find|need|want|me|a|an|the|for|under|around|below|within|price)\b/gi, " ")
      .replace(/[₹\d,]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Normalize specific compound keywords for best scoring
    function normalizeSearch(term: string) {
      let t = term;
      if (t.includes("smartwatch") || t.includes("smart watch") || t.includes("watch")) {
        t = "smart fitness watch smartwatch " + t;
      }
      if (t.includes("earphones") || t.includes("earbuds")) {
        t = "wireless bluetooth earbuds " + t;
      }
      if (t.includes("sneakers") || t.includes("shoes")) {
        t = "running shoes " + t;
      }
      return t.trim();
    }

    let searchTerms = [
      normalizeSearch(extractedClean),
      normalizeSearch(rawClean),
      extractedClean,
      rawClean
    ].filter(Boolean);

    let bestMatchItem: any = null;
    let bestScore = Infinity;

    for (const term of searchTerms) {
      const matches = fuse.search(term);
      if (matches.length > 0 && matches[0].score !== undefined && matches[0].score <= 0.45) {
        if (matches[0].score < bestScore) {
          bestScore = matches[0].score;
          bestMatchItem = matches[0].item;
        }
      }
    }

    // Direct token fallback if Fuse didn't hit threshold
    if (!bestMatchItem) {
      const words = (extractedClean || rawClean).split(" ").filter((w: string) => w.length >= 3);
      for (const w of words) {
        const direct = enrichedCatalog.find(p => p.keywords.includes(w));
        if (direct) {
          bestMatchItem = direct;
          break;
        }
      }
    }

    // 6. Handle "not_found" outcome
    // If no product matches the request, this is NOT a policy decision.
    // Do NOT write to Firestore transactions or audit trail.
    if (!bestMatchItem) {
      const suggestions = catalog.slice(0, 4).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        imageUrl: p.imageUrl
      }));

      res.json({
        decision: "not_found",
        reason: `I couldn't find a matching product — try one of our popular items below:`,
        suggestions
      });
      return;
    }

    const matchedProduct = bestMatchItem;

    // 7. CRITICAL: Evaluate matched product using REAL catalog price through the shared Decision Engine
    // Do not use the user's guessed/stated price for the firewall decision
    const realPrice = matchedProduct.price;
    const statedBudget = intent.budget;

    let priceNote = "";
    if (statedBudget && statedBudget !== realPrice) {
      priceNote = `Stated budget was ₹${statedBudget.toLocaleString("en-IN")}, but catalog price is ₹${realPrice.toLocaleString("en-IN")}. Policy evaluated using real catalog price.`;
    }

    // Call the ONE shared decision engine evaluatePurchaseRequest
    const result = await evaluatePurchaseRequest(merchantId, agentId, matchedProduct.id, realPrice);

    res.json({
      ...result,
      parsedProduct: matchedProduct,
      requestedAmount: realPrice,
      statedPrice: statedBudget || undefined,
      priceNote: priceNote || undefined,
      reason: priceNote ? `${result.reason} (${priceNote})` : result.reason
    });
  } catch (error: any) {
    console.error("Error in chat handling:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
