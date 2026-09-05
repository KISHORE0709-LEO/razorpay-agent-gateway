export interface Rules {
  maxOrder: number;
  dailyLimit: number;
  categories: string[];
  approvalAbove: number;
  maxDiscount: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
  stock?: number;
}

export type Decision = "approved" | "recovered" | "escalated" | "blocked" | "not_found" | "conversational";

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

export interface AuditEntry {
  id: string;
  time: string;
  timestamp?: string;
  agent: string;
  agentId?: string;
  product: string;
  productId?: string;
  amount: number;
  requestedAmount?: number;
  decision: Decision;
  reason: string;
  hash: string;
  prevHash: string;
  orderId?: string;
  status?: "pending" | "completed" | "denied" | "failed";
  savedAmount?: number;
  agentTrustScore?: number;
  agentTrustTier?: TrustTier;
  type?: "transaction" | "outcome_update";
  relatedTransactionId?: string;
  outcome?: "approved" | "denied";
}

export type VerdictChainEntry = AuditEntry;

export interface ApprovalItem {
  id: string;
  time: string;
  agent: string;
  product: Product;
  amount: number;
  reason: string;
  agentTrustScore?: number;
  agentTrustTier?: TrustTier;
}

export interface FirewallResult {
  decision: Decision;
  reason: string;
  alternative?: Product;
}
