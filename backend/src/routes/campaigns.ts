import { RequestHandler } from "express";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  getActiveCampaign,
  generateCampaignSuggestions,
  activateCampaign,
  deactivateCampaign,
} from "../services/campaigns";
import { Campaign } from "@shared/api";

export const handleListCampaigns: RequestHandler = async (req, res): Promise<any> => {
  try {
    const merchantId = (req.query.merchantId as string) || "demo_merchant";
    
    // Check if active campaign has expired
    const activeCampaign = await getActiveCampaign(merchantId);

    const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);
    const snap = await getDocs(campaignsRef);

    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));

    // If no campaigns exist at all, automatically generate initial suggestions
    if (items.length === 0) {
      items = await generateCampaignSuggestions(merchantId);
    }

    // Sort: active first, then suggested, then expired; within each by createdAt desc
    const statusOrder: Record<string, number> = { active: 0, suggested: 1, expired: 2 };
    items.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // Deduplicate by normalized title: keep only the single highest-priority/most-recent instance of each campaign name
    const seenTitles = new Set<string>();
    const deduplicatedItems: Campaign[] = [];
    for (const item of items) {
      const normTitle = (item.title || "").trim().toLowerCase();
      if (!normTitle || seenTitles.has(normTitle)) continue;
      seenTitles.add(normTitle);
      deduplicatedItems.push(item);
    }

    return res.json({
      activeCampaign,
      campaigns: deduplicatedItems,
    });
  } catch (error: any) {
    console.error("Error listing campaigns:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const handleGenerateCampaigns: RequestHandler = async (req, res): Promise<any> => {
  try {
    const merchantId = req.body.merchantId || "demo_merchant";
    const suggestions = await generateCampaignSuggestions(merchantId);

    // Fetch updated list of campaigns
    const campaignsRef = collection(db, `merchants/${merchantId}/campaigns`);
    const snap = await getDocs(campaignsRef);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));

    const statusOrder: Record<string, number> = { active: 0, suggested: 1, expired: 2 };
    items.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const seenTitles = new Set<string>();
    const deduplicatedItems: Campaign[] = [];
    for (const item of items) {
      const normTitle = (item.title || "").trim().toLowerCase();
      if (!normTitle || seenTitles.has(normTitle)) continue;
      seenTitles.add(normTitle);
      deduplicatedItems.push(item);
    }

    return res.json({
      success: true,
      count: suggestions.length,
      suggestions,
      campaigns: deduplicatedItems,
    });
  } catch (error: any) {
    console.error("Error generating campaigns:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const handleActivateCampaign: RequestHandler = async (req, res): Promise<any> => {
  try {
    const merchantId = req.body.merchantId || "demo_merchant";
    const { campaignId, durationHours } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: "Missing campaignId" });
    }

    const activated = await activateCampaign(merchantId, campaignId, durationHours || 48);
    return res.json({ success: true, campaign: activated });
  } catch (error: any) {
    console.error("Error activating campaign:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const handleDeactivateCampaign: RequestHandler = async (req, res): Promise<any> => {
  try {
    const merchantId = req.body.merchantId || "demo_merchant";
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: "Missing campaignId" });
    }

    await deactivateCampaign(merchantId, campaignId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deactivating campaign:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};
