import { db } from "../firebase";
import { doc, getDocFromServer, setDoc } from "firebase/firestore";
import { AgentTrustProfile, TrustTier } from "../../../shared/api";

export const DEFAULT_TRUST_SCORE = 50;

export function getTrustTier(score: number): TrustTier {
  if (score >= 80) return "Trusted";
  if (score < 30) return "Flagged";
  return "Neutral";
}

export function computeEffectiveThreshold(
  score: number,
  approvalThreshold: number,
  maxOrderAmount: number
): { effectiveThreshold: number; isRelaxed: boolean; isStrict: boolean } {
  if (score >= 80) {
    // Relaxed threshold: approvalThreshold + 1000, capped so it never exceeds maxOrderAmount
    const relaxed = Math.min(maxOrderAmount, approvalThreshold + 1000);
    return { effectiveThreshold: relaxed, isRelaxed: true, isStrict: false };
  }
  if (score < 30) {
    // Flagged agent: effectiveThreshold = 0, everything gets escalated regardless of amount
    return { effectiveThreshold: 0, isRelaxed: false, isStrict: true };
  }
  return { effectiveThreshold: approvalThreshold, isRelaxed: false, isStrict: false };
}

export async function getAgentTrust(merchantId: string, agentId: string): Promise<AgentTrustProfile> {
  const trustRef = doc(db, `merchants/${merchantId}/agentTrust/${agentId}`);
  try {
    const snap = await getDocFromServer(trustRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        agentId,
        score: typeof data.score === "number" ? data.score : DEFAULT_TRUST_SCORE,
        totalRequests: Number(data.totalRequests || 0),
        approvedCount: Number(data.approvedCount || 0),
        blockedCount: Number(data.blockedCount || 0),
        recoveredCount: Number(data.recoveredCount || 0),
        deniedEscalations: Number(data.deniedEscalations || 0),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(`Could not fetch agentTrust for ${agentId}, using default:`, err);
  }

  return {
    agentId,
    score: DEFAULT_TRUST_SCORE,
    totalRequests: 0,
    approvedCount: 0,
    blockedCount: 0,
    recoveredCount: 0,
    deniedEscalations: 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateAgentTrustOnTransaction(
  merchantId: string,
  agentId: string,
  event: "approved" | "accepted_recovery" | "blocked" | "denied_escalation"
): Promise<AgentTrustProfile> {
  const current = await getAgentTrust(merchantId, agentId);

  let delta = 0;
  let approvedDelta = 0;
  let blockedDelta = 0;
  let recoveredDelta = 0;
  let deniedEscalationsDelta = 0;
  let requestDelta = 1;

  switch (event) {
    case "approved":
      delta = 2;
      approvedDelta = 1;
      break;
    case "accepted_recovery":
      delta = 1;
      recoveredDelta = 1;
      break;
    case "blocked":
      delta = -10;
      blockedDelta = 1;
      break;
    case "denied_escalation":
      delta = -5;
      deniedEscalationsDelta = 1;
      requestDelta = 0; // The request was already counted when escalated
      break;
  }

  const rawScore = current.score + delta;
  const clampedScore = Math.max(0, Math.min(100, rawScore));

  const updatedProfile: AgentTrustProfile = {
    agentId,
    score: clampedScore,
    totalRequests: current.totalRequests + requestDelta,
    approvedCount: current.approvedCount + approvedDelta,
    blockedCount: current.blockedCount + blockedDelta,
    recoveredCount: current.recoveredCount + recoveredDelta,
    deniedEscalations: current.deniedEscalations + deniedEscalationsDelta,
    updatedAt: new Date().toISOString(),
  };

  const trustRef = doc(db, `merchants/${merchantId}/agentTrust/${agentId}`);
  await setDoc(trustRef, updatedProfile, { merge: true });

  return updatedProfile;
}
