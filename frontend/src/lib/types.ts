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
}

export type Decision = "approved" | "recovered" | "escalated" | "blocked";

export interface AuditEntry {
  id: string;
  time: string;
  agent: string;
  product: string;
  amount: number;
  decision: Decision;
  reason: string;
  hash: string;
  prevHash: string;
  orderId?: string;
}

export interface ApprovalItem {
  id: string;
  time: string;
  agent: string;
  product: Product;
  amount: number;
  reason: string;
}

export interface FirewallResult {
  decision: Decision;
  reason: string;
  alternative?: Product;
}
