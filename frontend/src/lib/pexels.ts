import { apiUrl } from "./api";

export const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

/**
 * Fetch a real, relevant product image using Pexels API.
 * Calls backend /api/product-image (which uses PEXELS_API_KEY),
 * with client-side fallback if VITE_PEXELS_API_KEY is configured.
 * Falls back to category if product name returns 0 results,
 * and a neutral product image as last resort.
 */
export async function fetchProductImage(
  productName: string,
  category?: string
): Promise<string> {
  const cleanName = (productName || "").trim();
  const cleanCategory = (category || "").trim();

  // 1. Try via backend /api/product-image (safely uses server-side PEXELS_API_KEY)
  try {
    const params = new URLSearchParams();
    if (cleanName) params.append("query", cleanName);
    if (cleanCategory) params.append("category", cleanCategory);

    const res = await fetch(apiUrl(`/api/product-image?${params.toString()}`));
    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl && !data.imageUrl.includes("seed/")) {
        return data.imageUrl;
      }
    }
  } catch (err) {
    console.warn("Backend /api/product-image request failed:", err);
  }

  // 2. Direct client-side fetch if VITE_PEXELS_API_KEY is provided in browser
  const clientKey = (import.meta as any).env?.VITE_PEXELS_API_KEY;
  if (clientKey) {
    try {
      if (cleanName) {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanName)}&per_page=1`;
        const pexelsRes = await fetch(url, { headers: { Authorization: clientKey } });
        if (pexelsRes.ok) {
          const pexelsData = await pexelsRes.json();
          if (pexelsData.photos?.[0]?.src?.medium) {
            return pexelsData.photos[0].src.medium;
          }
        }
      }

      if (cleanCategory) {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanCategory)}&per_page=1`;
        const pexelsRes = await fetch(url, { headers: { Authorization: clientKey } });
        if (pexelsRes.ok) {
          const pexelsData = await pexelsRes.json();
          if (pexelsData.photos?.[0]?.src?.medium) {
            return pexelsData.photos[0].src.medium;
          }
        }
      }
    } catch (clientErr) {
      console.warn("Direct Pexels client fetch error:", clientErr);
    }
  }

  // 3. Fallback placeholder
  return DEFAULT_FALLBACK_IMAGE;
}
