import { PolicyStrategy } from "@shared/api";
import { db } from "./firebase";
import { apiUrl } from "./api";
import { collection, getDocs } from "firebase/firestore";

/**
 * Generates three data-driven policy strategies (Conservative, Balanced, Growth)
 * based on the merchant's catalog and last 30 days of transactions.
 * Tries the backend policy advisor endpoint first; falls back to direct Firestore.
 */
export async function generatePolicyStrategies(
  merchantId: string = "demo_merchant"
): Promise<PolicyStrategy[]> {
  try {
    const res = await fetch(apiUrl(`/api/rules/advisor?merchantId=${encodeURIComponent(merchantId)}`));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.strategies) && data.strategies.length === 3) {
        return data.strategies;
      }
    }
  } catch (err) {
    console.warn("API policy advisor endpoint fallback to direct Firestore calculation:", err);
  }

  // Direct Firestore computation fallback
  // 1. Read catalog
  const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
  const catalogSnap = await getDocs(catalogRef);
  const products: Array<{ id: string; name?: string; price?: number; category?: string }> = [];

  catalogSnap.forEach((d) => {
    products.push({ id: d.id, ...d.data() });
  });

  const categorySet = new Set<string>();
  const prices: number[] = [];
  const categoryPriceRanges: Record<string, { min: number; max: number; count: number }> = {};

  for (const p of products) {
    const cat = p.category?.trim();
    if (cat) {
      categorySet.add(cat);
      const pr = Number(p.price || 0);
      if (pr > 0) {
        if (!categoryPriceRanges[cat]) {
          categoryPriceRanges[cat] = { min: pr, max: pr, count: 0 };
        }
        categoryPriceRanges[cat].min = Math.min(categoryPriceRanges[cat].min, pr);
        categoryPriceRanges[cat].max = Math.max(categoryPriceRanges[cat].max, pr);
        categoryPriceRanges[cat].count++;
      }
    }
    const pr = Number(p.price || 0);
    if (pr > 0) {
      prices.push(pr);
    }
  }

  const distinctCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  const suggestedCategories =
    distinctCategories.length > 0
      ? distinctCategories
      : ["Electronics", "Fashion", "Groceries", "Home & Kitchen"];

  prices.sort((a, b) => a - b);
  const _minPrice = prices.length ? prices[0] : 499;
  const maxPrice = prices.length ? prices[prices.length - 1] : 4999;
  let medianPrice = 1499;
  if (prices.length > 0) {
    const mid = Math.floor(prices.length / 2);
    medianPrice = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }

  // 2. Read last 30 days of transactions
  const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
  const txnsSnap = await getDocs(txnsRef);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let total30dRequests = 0;
  let blocked30d = 0;
  let recovered30d = 0;
  let escalated30d = 0;

  txnsSnap.forEach((d) => {
    const data = d.data();
    if (data.type === "outcome_update") return;
    const t = new Date(data.time || data.timestamp || 0).getTime();
    if (t >= thirtyDaysAgo) {
      total30dRequests++;
      if (data.decision === "blocked") blocked30d++;
      else if (data.decision === "recovered") recovered30d++;
      else if (data.decision === "escalated") escalated30d++;
    }
  });

  const blockRate = total30dRequests > 0 ? blocked30d / total30dRequests : 0;
  const recoveryRate = total30dRequests > 0 ? recovered30d / total30dRequests : 0;
  const frictionRate = blockRate + recoveryRate;
  const hasHighFriction = total30dRequests >= 5 && frictionRate > 0.2;
  const frictionPct = Math.round(frictionRate * 100);

  // 3. Compute rules
  let rawBalancedMaxOrder = Math.ceil(medianPrice / 500) * 500;
  if (rawBalancedMaxOrder < 500) rawBalancedMaxOrder = 500;

  let balancedMaxOrder = rawBalancedMaxOrder;
  if (hasHighFriction) {
    balancedMaxOrder = Math.ceil((rawBalancedMaxOrder * 1.2) / 500) * 500;
  }
  const balancedThreshold = Math.round(balancedMaxOrder * 0.4);
  const balancedDaily = balancedMaxOrder * 6;
  const balancedDiscount = 10;
  const balancedReasoning = hasHighFriction
    ? `Adjusted up — ${frictionPct}% of recent requests were being recovered or blocked near your old cap; calibrated to ₹${balancedMaxOrder.toLocaleString("en-IN")} based on ₹${Math.round(medianPrice).toLocaleString("en-IN")} median price.`
    : `Calibrated around your catalog median price of ₹${Math.round(medianPrice).toLocaleString("en-IN")}, with a 6x daily volume cushion for steady operations.`;

  const conservativeMaxOrder = Math.round((rawBalancedMaxOrder * 0.7) / 100) * 100;
  const conservativeThreshold = Math.round((rawBalancedMaxOrder * 0.25) / 100) * 100;
  const conservativeDaily = conservativeMaxOrder * 4;
  const conservativeDiscount = 5;
  const conservativeReasoning = `Prioritizes risk mitigation: limits transaction caps to ₹${conservativeMaxOrder.toLocaleString("en-IN")} (70% of median baseline) with early approval triggers above ₹${conservativeThreshold.toLocaleString("en-IN")}.`;

  let baseGrowthMaxOrder = Math.max(maxPrice, Math.round(balancedMaxOrder * 1.2));
  baseGrowthMaxOrder = Math.ceil(baseGrowthMaxOrder / 500) * 500;

  const growthMaxOrder = baseGrowthMaxOrder;
  const growthThreshold = Math.round(growthMaxOrder * 0.6);
  const growthDaily = growthMaxOrder * 10;
  const growthDiscount = 15;
  const growthReasoning = hasHighFriction
    ? `Adjusted up for revenue scale — accommodates top catalog items (up to ₹${maxPrice.toLocaleString("en-IN")}) while relieving the ${frictionPct}% friction from recent restricted orders.`
    : `Optimized for maximum sales capture: covers your top catalog items up to ₹${growthMaxOrder.toLocaleString("en-IN")} (catalog peak ₹${maxPrice.toLocaleString("en-IN")}) with an expansive 10x daily velocity pool.`;

  return [
    {
      name: "Conservative",
      maxOrderAmount: conservativeMaxOrder,
      dailySpendLimit: conservativeDaily,
      approvalThreshold: conservativeThreshold,
      maxDiscountPercent: conservativeDiscount,
      suggestedCategories,
      reasoning: conservativeReasoning,
    },
    {
      name: "Balanced",
      maxOrderAmount: balancedMaxOrder,
      dailySpendLimit: balancedDaily,
      approvalThreshold: balancedThreshold,
      maxDiscountPercent: balancedDiscount,
      suggestedCategories,
      reasoning: balancedReasoning,
    },
    {
      name: "Growth",
      maxOrderAmount: growthMaxOrder,
      dailySpendLimit: growthDaily,
      approvalThreshold: growthThreshold,
      maxDiscountPercent: growthDiscount,
      suggestedCategories,
      reasoning: growthReasoning,
    },
  ];
}
