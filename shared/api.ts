/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type TrustTier = "Trusted" | "Neutral" | "Flagged";

export interface AgentTrustProfile {
  agentId: string;
  score: number;
  totalRequests: number;
  approvedCount: number;
  blockedCount: number;
  recoveredCount: number;
  deniedEscalations: number;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  suggestion: string;
  ruleOverride: {
    maxOrderAmount?: number;
    approvalThreshold?: number;
    maxDiscountPercent?: number;
    dailySpendLimit?: number;
  };
  categoryTarget?: string;
  createdAt: string;
  expiresAt?: string;
  status: "suggested" | "active" | "expired";
  source: "orchestrator";
  activatedAt?: string;
}

export interface PolicyStrategy {
  name: "Conservative" | "Balanced" | "Growth";
  maxOrderAmount: number;
  dailySpendLimit: number;
  approvalThreshold: number;
  maxDiscountPercent: number;
  suggestedCategories: string[];
  reasoning: string;
}

export interface OutcomeUpdateEntry {
  type: "outcome_update";
  relatedTransactionId: string;
  outcome: "approved" | "denied";
  reason: string;
  timestamp: string;
  time?: string;
  prevHash: string;
  hash: string;
  orderId?: string;
  razorpayOrderId?: string;
  agent?: string;
  agentId?: string;
  product?: string;
  productId?: string;
  amount?: number;
  requestedAmount?: number;
}

/**
 * Determines if an ISO date string falls on the current local calendar day.
 */
export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Calculates the exact real-time sum of today's approved spend across the ledger.
 * This is the single source of truth for both the backend firewall spend check
 * and the frontend Overview progress bar.
 */
export function calculateTodayApprovedSpend(entries: Array<{
  type?: string;
  decision?: string;
  outcome?: string;
  time?: string;
  timestamp?: string;
  amount?: number;
  requestedAmount?: number;
  status?: string;
}>): number {
  const now = new Date();
  let total = 0;

  for (const entry of entries) {
    const timeVal = entry.timestamp || entry.time;
    if (!timeVal) continue;
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) continue;

    if (
      d.getFullYear() !== now.getFullYear() ||
      d.getMonth() !== now.getMonth() ||
      d.getDate() !== now.getDate()
    ) {
      continue;
    }

    if (entry.type === "outcome_update") {
      if (entry.outcome === "approved") {
        total += Number(entry.amount ?? entry.requestedAmount ?? 0);
      }
    } else {
      if (
        (entry.decision === "approved" || entry.status === "completed") &&
        entry.status !== "failed"
      ) {
        total += Number(entry.amount ?? entry.requestedAmount ?? 0);
      }
    }
  }

  return total;
}


