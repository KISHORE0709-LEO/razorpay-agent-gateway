export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export async function computeTxnHash(
  prevHash: string,
  data: { time: string; agent: string; product: string; amount: number; decision: string; reason: string }
): Promise<string> {
  const payload = `${prevHash}|${data.time}|${data.agent}|${data.product}|${data.amount}|${data.decision}|${data.reason}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeHash(prevHash: string, data: any): Promise<string> {
  if (data.time && data.agent && data.product && data.decision) {
    return computeTxnHash(prevHash, data);
  }
  const hashString = prevHash + JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  return `0x${hash.slice(0, 10)}`;
}
