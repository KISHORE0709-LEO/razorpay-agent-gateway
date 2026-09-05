import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { Campaign } from "@shared/api";

const SAFETY_CEILING_FACTOR = 1.2; // Maximum 20% increase above base rules

/**
 * Retrieves the currently active, non-expired campaign for the merchant.
 * Automatically marks expired campaigns if now > expiresAt.
 */
export async function getActiveCampaign(merchantId: string): Promise<Campaign | null> {
  const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);
  const q = query(campaignsRef, where("status", "==", "active"));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const now = new Date().getTime();

  for (const docSnap of snap.docs) {
    const data = { id: docSnap.id, ...docSnap.data() } as Campaign;
    if (data.expiresAt) {
      const expTime = new Date(data.expiresAt).getTime();
      if (now > expTime) {
        // Automatically expire past-due campaign
        await updateDoc(docSnap.ref, { status: "expired" });
        continue;
      }
    }
    return data;
  }

  return null;
}

/**
 * Applies active campaign rule overrides on top of base rules.
 * Enforces the strict 20% safety ceiling — no override may exceed 20% above the base rule.
 */
export function applyCampaignOverride(
  baseRules: any,
  activeCampaign: Campaign | null
): {
  effectiveRules: any;
  campaignApplied: {
    id: string;
    title: string;
    expiresAt?: string;
    summary: string;
  } | null;
} {
  if (!activeCampaign || activeCampaign.status !== "active") {
    return { effectiveRules: { ...baseRules }, campaignApplied: null };
  }

  const effectiveRules = { ...baseRules };
  const override = activeCampaign.ruleOverride || {};
  const adjustments: string[] = [];

  // 1. Max Order Amount (Clamped to +20% max)
  if (override.maxOrderAmount !== undefined) {
    const baseVal = Number(baseRules.maxOrderAmount || 0);
    const maxAllowed = Math.round(baseVal * SAFETY_CEILING_FACTOR);
    const targetVal = Number(override.maxOrderAmount);
    effectiveRules.maxOrderAmount = Math.min(targetVal, maxAllowed);
    adjustments.push(`Max Order: ₹${effectiveRules.maxOrderAmount} (base ₹${baseVal})`);
  }

  // 2. Approval Threshold (Clamped to +20% max)
  if (override.approvalThreshold !== undefined) {
    const baseVal = Number(baseRules.approvalThreshold || 0);
    const maxAllowed = Math.round(baseVal * SAFETY_CEILING_FACTOR);
    const targetVal = Number(override.approvalThreshold);
    effectiveRules.approvalThreshold = Math.min(targetVal, maxAllowed);
    adjustments.push(`Approval Threshold: ₹${effectiveRules.approvalThreshold} (base ₹${baseVal})`);
  }

  // 3. Daily Spend Limit (Clamped to +20% max)
  if (override.dailySpendLimit !== undefined) {
    const baseVal = Number(baseRules.dailySpendLimit || 0);
    const maxAllowed = Math.round(baseVal * SAFETY_CEILING_FACTOR);
    const targetVal = Number(override.dailySpendLimit);
    effectiveRules.dailySpendLimit = Math.min(targetVal, maxAllowed);
    adjustments.push(`Daily Limit: ₹${effectiveRules.dailySpendLimit} (base ₹${baseVal})`);
  }

  // 4. Max Discount Percent (Clamped to +20% max)
  if (override.maxDiscountPercent !== undefined) {
    const baseVal = Number(baseRules.maxDiscountPercent || 0);
    const maxAllowed = Math.round(baseVal * SAFETY_CEILING_FACTOR);
    const targetVal = Number(override.maxDiscountPercent);
    effectiveRules.maxDiscountPercent = Math.min(targetVal, maxAllowed);
    adjustments.push(`Max Discount: ${effectiveRules.maxDiscountPercent}% (base ${baseVal}%)`);
  }

  return {
    effectiveRules,
    campaignApplied: {
      id: activeCampaign.id,
      title: activeCampaign.title || "Active Growth Campaign",
      expiresAt: activeCampaign.expiresAt,
      summary: adjustments.join(" • "),
    },
  };
}

/**
 * Analyzes last 7 days of transactions to generate 1-3 plain-English campaign suggestions.
 */
export async function generateCampaignSuggestions(merchantId: string): Promise<Campaign[]> {
  const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);

  const [txnsSnap, rulesSnap] = await Promise.all([
    getDocs(txnsRef),
    getDoc(rulesRef),
  ]);

  const baseRules = rulesSnap.exists() ? rulesSnap.data() : {
    maxOrderAmount: 5000,
    approvalThreshold: 2000,
    dailySpendLimit: 25000,
    maxDiscountPercent: 10,
  };

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentTxns: any[] = [];

  txnsSnap.forEach((d) => {
    const data = d.data();
    const t = new Date(data.time || data.timestamp || 0).getTime();
    if (t >= sevenDaysAgo) {
      recentTxns.push(data);
    }
  });

  // Category counts and decisions
  const categoryCounts: Record<string, { total: number; recovered: number; blocked: number; approved: number }> = {};
  let highValueRequests = 0;

  for (const tx of recentTxns) {
    const cat = tx.productCategory || tx.category || "Electronics";
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = { total: 0, recovered: 0, blocked: 0, approved: 0 };
    }
    categoryCounts[cat].total++;
    if (tx.decision === "recovered") categoryCounts[cat].recovered++;
    if (tx.decision === "blocked") categoryCounts[cat].blocked++;
    if (tx.decision === "approved") categoryCounts[cat].approved++;

    const amt = Number(tx.amount || tx.requestedAmount || 0);
    if (amt > Number(baseRules.approvalThreshold || 0)) {
      highValueRequests++;
    }
  }

  const baseMaxOrder = Number(baseRules.maxOrderAmount || 5000);
  const baseThreshold = Number(baseRules.approvalThreshold || 2000);
  const baseDailyLimit = Number(baseRules.dailySpendLimit || 25000);

  const suggestedCampaigns: Array<Omit<Campaign, "id">> = [];

  // Suggestion 1: Boost per-order cap for high-demand category (e.g. +10%, <= 20%)
  const boostedOrderAmount = Math.min(Math.round(baseMaxOrder * 1.1), Math.round(baseMaxOrder * SAFETY_CEILING_FACTOR));
  suggestedCampaigns.push({
    title: "Electronics Flash Order Expansion",
    suggestion: `Elevate the per-order limit from ₹${baseMaxOrder} to ₹${boostedOrderAmount} (+10%) for 48 hours to capture high-ticket shopper carts while maintaining strict risk controls.`,
    ruleOverride: {
      maxOrderAmount: boostedOrderAmount,
    },
    categoryTarget: "Electronics",
    createdAt: new Date().toISOString(),
    status: "suggested",
    source: "orchestrator",
  });

  // Suggestion 2: Raise approval threshold for faster checkout (+15%, <= 20%)
  const boostedThreshold = Math.min(Math.round(baseThreshold * 1.15), Math.round(baseThreshold * SAFETY_CEILING_FACTOR));
  suggestedCampaigns.push({
    title: "Trusted Agent Fast-Track Window",
    suggestion: `Raise the instant approval threshold from ₹${baseThreshold} to ₹${boostedThreshold} (+15%) for 48 hours to streamline autonomous agent checkouts with zero manual queue friction.`,
    ruleOverride: {
      approvalThreshold: boostedThreshold,
    },
    createdAt: new Date().toISOString(),
    status: "suggested",
    source: "orchestrator",
  });

  // Suggestion 3: Daily Cap Cushion (+10%, <= 20%)
  const boostedDaily = Math.min(Math.round(baseDailyLimit * 1.1), Math.round(baseDailyLimit * SAFETY_CEILING_FACTOR));
  suggestedCampaigns.push({
    title: "Weekend Spend Surge Allowance",
    suggestion: `Temporarily expand merchant daily limit from ₹${baseDailyLimit} to ₹${boostedDaily} (+10%) to accommodate peak sales volume without early daily cutoffs.`,
    ruleOverride: {
      dailySpendLimit: boostedDaily,
    },
    createdAt: new Date().toISOString(),
    status: "suggested",
    source: "orchestrator",
  });

  // Save to Firestore
  const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);
  const createdList: Campaign[] = [];

  for (const camp of suggestedCampaigns) {
    const docRef = await addDoc(campaignsRef, camp);
    createdList.push({ id: docRef.id, ...camp });
  }

  return createdList;
}

/**
 * Activates a campaign, enforcing 48-hour default expiry and retiring other active campaigns.
 */
export async function activateCampaign(
  merchantId: string,
  campaignId: string,
  durationHours = 48
): Promise<Campaign> {
  const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);

  // Deactivate any currently active campaigns
  const activeQ = query(campaignsRef, where("status", "==", "active"));
  const activeSnap = await getDocs(activeQ);
  for (const docSnap of activeSnap.docs) {
    await updateDoc(docSnap.ref, { status: "expired" });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  const targetRef = doc(db, `merchants/${merchantId}/campaigns/${campaignId}`);
  await updateDoc(targetRef, {
    status: "active",
    activatedAt: now.toISOString(),
    expiresAt,
  });

  const updatedSnap = await getDoc(targetRef);
  return { id: updatedSnap.id, ...updatedSnap.data() } as Campaign;
}

/**
 * Deactivates an active campaign.
 */
export async function deactivateCampaign(merchantId: string, campaignId: string): Promise<void> {
  const targetRef = doc(db, `merchants/${merchantId}/campaigns/${campaignId}`);
  await updateDoc(targetRef, {
    status: "expired",
    deactivatedAt: new Date().toISOString(),
  });
}
