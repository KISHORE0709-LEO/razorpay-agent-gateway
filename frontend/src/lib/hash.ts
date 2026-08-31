export const GENESIS_HASH = "0".repeat(14);

export async function computeHash(prevHash: string, data: any): Promise<string> {
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
