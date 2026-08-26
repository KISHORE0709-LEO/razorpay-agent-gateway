import { Product } from "./types";

export const CATEGORIES = ["Electronics", "Fashion", "Groceries", "Home & Kitchen"] as const;

export const CATALOG: Product[] = [
  { id: "p1", name: "Wireless Mouse", category: "Electronics", price: 1299 },
  { id: "p2", name: "Wireless Mouse Pro", category: "Electronics", price: 1799 },
  { id: "p3", name: "Bluetooth Speaker", category: "Electronics", price: 2499 },
  { id: "p4", name: "Mechanical Keyboard", category: "Electronics", price: 3499 },
  { id: "p5", name: "Smartwatch", category: "Electronics", price: 4899 },
  { id: "p6", name: "Wireless Earbuds Pro", category: "Electronics", price: 5750 },
  { id: "p7", name: "Noise Cancelling Headphones", category: "Electronics", price: 6999 },
  { id: "p8", name: '27" 4K Monitor', category: "Electronics", price: 15999 },
  { id: "p9", name: "Cotton T-Shirt", category: "Fashion", price: 799 },
  { id: "p10", name: "Running Shoes", category: "Fashion", price: 3499 },
  { id: "p11", name: "Leather Wallet", category: "Fashion", price: 1599 },
  { id: "p12", name: "Basmati Rice 5kg", category: "Groceries", price: 650 },
  { id: "p13", name: "Organic Almonds 1kg", category: "Groceries", price: 899 },
  { id: "p14", name: "Cold Pressed Olive Oil", category: "Groceries", price: 1200 },
  { id: "p15", name: "Air Fryer", category: "Home & Kitchen", price: 5499 },
  { id: "p16", name: "Study Lamp", category: "Home & Kitchen", price: 1299 },
  { id: "p17", name: "Office Chair", category: "Home & Kitchen", price: 8999 },
];

const PRODUCT_KEYWORDS: { keywords: string[]; productId: string }[] = [
  { keywords: ["mouse pro"], productId: "p2" },
  { keywords: ["mouse"], productId: "p1" },
  { keywords: ["speaker"], productId: "p3" },
  { keywords: ["keyboard"], productId: "p4" },
  { keywords: ["smartwatch", "smart watch", "watch"], productId: "p5" },
  { keywords: ["earbuds", "earbud"], productId: "p6" },
  { keywords: ["headphone"], productId: "p7" },
  { keywords: ["monitor", "display", "screen"], productId: "p8" },
  { keywords: ["t-shirt", "tshirt", "shirt"], productId: "p9" },
  { keywords: ["running shoes", "shoes", "sneakers"], productId: "p10" },
  { keywords: ["wallet"], productId: "p11" },
  { keywords: ["rice"], productId: "p12" },
  { keywords: ["almond"], productId: "p13" },
  { keywords: ["olive oil", "oil"], productId: "p14" },
  { keywords: ["air fryer", "fryer"], productId: "p15" },
  { keywords: ["lamp"], productId: "p16" },
  { keywords: ["office chair", "chair"], productId: "p17" },
];

const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ["electronics", "gadget", "tech"], category: "Electronics" },
  { keywords: ["fashion", "clothing", "clothes", "apparel"], category: "Fashion" },
  { keywords: ["groceries", "grocery", "food"], category: "Groceries" },
  { keywords: ["home", "kitchen", "furniture"], category: "Home & Kitchen" },
];

export interface ParsedIntent {
  product?: Product;
  category?: string;
  budget?: number;
}

export function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase();

  const amountMatch = lower.match(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)/i);
  const budget = amountMatch
    ? Number(amountMatch[1].replace(/,/g, ""))
    : undefined;

  for (const entry of PRODUCT_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      const product = CATALOG.find((p) => p.id === entry.productId);
      if (product) return { product, budget };
    }
  }

  let category: string | undefined;
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      category = entry.category;
      break;
    }
  }

  if (category && budget) {
    const candidates = CATALOG.filter(
      (p) => p.category === category && p.price <= budget,
    ).sort((a, b) => b.price - a.price);
    if (candidates.length > 0) return { product: candidates[0], category, budget };

    const cheapest = CATALOG.filter((p) => p.category === category).sort(
      (a, b) => a.price - b.price,
    )[0];
    return { product: cheapest, category, budget };
  }

  if (category) {
    const cheapest = CATALOG.filter((p) => p.category === category).sort(
      (a, b) => a.price - b.price,
    )[0];
    return { product: cheapest, category, budget };
  }

  return { budget };
}

export function findAlternative(category: string, maxPrice: number, excludeId?: string) {
  return CATALOG.filter(
    (p) => p.category === category && p.price <= maxPrice && p.id !== excludeId,
  ).sort((a, b) => b.price - a.price)[0];
}
