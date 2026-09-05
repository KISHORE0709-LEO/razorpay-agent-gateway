export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export async function computeTxnHash(
  prevHash: string,
  data: {
    time?: string;
    timestamp?: string;
    agent?: string;
    agentId?: string;
    product?: string;
    productId?: string;
    amount?: number;
    requestedAmount?: number;
    decision: string;
    reason: string;
  }
): Promise<string> {
  const timeVal = data.timestamp || data.time || "";
  const agentVal = data.agentId || data.agent || "";
  const prodVal = data.productId || data.product || "";
  const amountVal = Number(data.requestedAmount ?? data.amount ?? 0);
  const decisionVal = data.decision || "";
  const reasonVal = data.reason || "";
  const payload = `${prevHash}|${timeVal}|${agentVal}|${prodVal}|${amountVal}|${decisionVal}|${reasonVal}`;

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeOutcomeUpdateHash(
  prevHash: string,
  data: {
    timestamp?: string;
    time?: string;
    relatedTransactionId: string;
    outcome: string;
    reason: string;
  }
): Promise<string> {
  const timeVal = data.timestamp || data.time || "";
  const payload = `${prevHash}|${timeVal}|outcome_update|${data.relatedTransactionId}|${data.outcome}|${data.reason}`;

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeEntryHash(prevHash: string, entry: any): Promise<string> {
  if (entry.type === "outcome_update") {
    return computeOutcomeUpdateHash(prevHash, {
      timestamp: entry.timestamp || entry.time,
      relatedTransactionId: entry.relatedTransactionId,
      outcome: entry.outcome,
      reason: entry.reason,
    });
  }
  return computeTxnHash(prevHash, entry);
}

export async function computeHash(prevHash: string, data: any): Promise<string> {
  return computeEntryHash(prevHash, data);
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  return `0x${hash.slice(0, 10)}`;
}
