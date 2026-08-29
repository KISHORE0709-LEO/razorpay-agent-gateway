import { findAlternative } from "./catalog";
import { FirewallResult, Product, Rules } from "./types";

export function evaluateRequest(
  product: Product,
  rules: Rules,
  dailySpent: number,
): FirewallResult {
  // 1. Agent identity is checked against a token before this function runs;
  // in this demo every request already carries a verified agent token.

  // 2. Category allow-list.
  if (!rules.categories.includes(product.category)) {
    return {
      decision: "blocked",
      reason: `"${product.category}" is not in the merchant's allowed category list`,
    };
  }

  // 3. Per-order cap.
  if (product.price > rules.maxOrder) {
    const alternative = findAlternative(
      product.category,
      rules.maxOrder,
      product.id,
    );
    if (alternative) {
      return {
        decision: "recovered",
        reason: `₹${product.price.toLocaleString("en-IN")} exceeds the per-order cap of ₹${rules.maxOrder.toLocaleString("en-IN")} — suggesting a lower-priced alternative`,
        alternative,
      };
    }
    return {
      decision: "blocked",
      reason: `₹${product.price.toLocaleString("en-IN")} exceeds the per-order cap of ₹${rules.maxOrder.toLocaleString("en-IN")} and no in-budget alternative was found`,
    };
  }

  // 4. Daily spend cap.
  if (dailySpent + product.price > rules.dailyLimit) {
    return {
      decision: "blocked",
      reason: `Today's spend (₹${dailySpent.toLocaleString("en-IN")}) plus this order would exceed the daily cap of ₹${rules.dailyLimit.toLocaleString("en-IN")}`,
    };
  }

  // 5. Human approval threshold.
  if (product.price > rules.approvalAbove) {
    return {
      decision: "escalated",
      reason: `₹${product.price.toLocaleString("en-IN")} is above the approval threshold of ₹${rules.approvalAbove.toLocaleString("en-IN")} — routed to merchant`,
    };
  }

  return {
    decision: "approved",
    reason: "Within per-order cap, daily limit, and category allow-list",
  };
}
