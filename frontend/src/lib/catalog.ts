import { Product } from "./types";

export const CATEGORIES = ["Electronics", "Fashion", "Groceries", "Home & Kitchen"] as const;

export const CATALOG: Product[] = [
  { id: "prod_1", name: "Wireless Bluetooth Earbuds", category: "Electronics", price: 1499, imageUrl: "https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_2", name: "Smart Fitness Watch", category: "Electronics", price: 2999, imageUrl: "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_3", name: "Cotton Casual Shirt", category: "Fashion", price: 899, imageUrl: "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_4", name: "Running Shoes", category: "Fashion", price: 2499, imageUrl: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_5", name: "Non-Stick Cookware Set", category: "Home & Kitchen", price: 3499, imageUrl: "https://images.pexels.com/photos/4253127/pexels-photo-4253127.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_6", name: "Electric Kettle", category: "Home & Kitchen", price: 1299, imageUrl: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_7", name: "Premium Basmati Rice 5kg", category: "Groceries", price: 650, imageUrl: "https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_8", name: "Olive Oil 1L", category: "Groceries", price: 850, imageUrl: "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_9", name: "Noise Cancelling Headphones", category: "Electronics", price: 7999, imageUrl: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350" },
  { id: "prod_10", name: "Formal Leather Belt", category: "Fashion", price: 499, imageUrl: "https://images.pexels.com/photos/45055/leather-belt-brown-metal-45055.jpeg?auto=compress&cs=tinysrgb&h=350" }
];

const PRODUCT_KEYWORDS: { keywords: string[]; productId: string }[] = [
  { keywords: ["earbud", "earbuds", "bluetooth"], productId: "prod_1" },
  { keywords: ["watch", "smartwatch", "fitness"], productId: "prod_2" },
  { keywords: ["shirt", "casual shirt"], productId: "prod_3" },
  { keywords: ["running shoes", "shoes", "sneakers"], productId: "prod_4" },
  { keywords: ["cookware", "non-stick", "pan"], productId: "prod_5" },
  { keywords: ["kettle", "electric kettle"], productId: "prod_6" },
  { keywords: ["rice", "basmati"], productId: "prod_7" },
  { keywords: ["olive oil", "oil"], productId: "prod_8" },
  { keywords: ["headphone", "headphones", "noise cancelling"], productId: "prod_9" },
  { keywords: ["belt", "leather belt"], productId: "prod_10" },
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
