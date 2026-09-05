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

