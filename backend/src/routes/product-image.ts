import { RequestHandler } from "express";

const FALLBACK_PLACEHOLDER = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

export async function queryPexelsImage(query: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: apiKey,
      },
    });
    if (!res.ok) {
      console.warn(`Pexels API responded with status ${res.status} for query "${query}"`);
      return null;
    }
    const data = await res.json();
    if (data.photos && data.photos.length > 0 && data.photos[0]?.src?.medium) {
      return data.photos[0].src.medium;
    }
    return null;
  } catch (err) {
    console.error(`Error querying Pexels API for "${query}":`, err);
    return null;
  }
}

const CURATED_PEXELS_MAP: Record<string, string> = {
  "bluetooth headphones": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350",
  "headphones": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350",
  "wireless bluetooth earbuds": "https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&h=350",
  "earbuds": "https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&h=350",
  "smart fitness watch": "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&h=350",
  "watch": "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&h=350",
  "cotton casual shirt": "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=350",
  "shirt": "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=350",
  "running shoes": "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&h=350",
  "shoes": "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&h=350",
  "non-stick cookware set": "https://images.pexels.com/photos/4253127/pexels-photo-4253127.jpeg?auto=compress&cs=tinysrgb&h=350",
  "cookware": "https://images.pexels.com/photos/4253127/pexels-photo-4253127.jpeg?auto=compress&cs=tinysrgb&h=350",
  "electric kettle": "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&h=350",
  "kettle": "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&h=350",
  "premium basmati rice 5kg": "https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&h=350",
  "rice": "https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&h=350",
  "olive oil 1l": "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&h=350",
  "olive oil": "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&h=350",
  "noise cancelling headphones": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350",
  "formal leather belt": "https://images.pexels.com/photos/45055/leather-belt-brown-metal-45055.jpeg?auto=compress&cs=tinysrgb&h=350",
  "belt": "https://images.pexels.com/photos/45055/leather-belt-brown-metal-45055.jpeg?auto=compress&cs=tinysrgb&h=350"
};

export const handleProductImage: RequestHandler = async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const apiKey = process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY;

  if (!apiKey) {
    const lower = query.toLowerCase();
    for (const [k, url] of Object.entries(CURATED_PEXELS_MAP)) {
      if (lower.includes(k) || k.includes(lower)) {
        return res.json({ imageUrl: url, source: "curated_fallback" });
      }
    }
    return res.json({
      imageUrl: FALLBACK_PLACEHOLDER,
      source: "fallback_no_key",
    });
  }

  // 1. Try product name query
  if (query) {
    const photoUrl = await queryPexelsImage(query, apiKey);
    if (photoUrl) {
      return res.json({ imageUrl: photoUrl, source: "pexels_query" });
    }
  }

  // 2. Fall back to category query if product name returned 0 results
  if (category) {
    const photoUrl = await queryPexelsImage(category, apiKey);
    if (photoUrl) {
      return res.json({ imageUrl: photoUrl, source: "pexels_category" });
    }
  }

  // 3. Last resort fallback
  return res.json({
    imageUrl: FALLBACK_PLACEHOLDER,
    source: "fallback_default",
  });
};
