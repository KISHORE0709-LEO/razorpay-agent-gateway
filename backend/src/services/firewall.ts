import { db } from "../firebase";
import { collection, doc, getDoc, getDocFromServer, getDocs, limit, orderBy, query, setDoc, where, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import * as crypto from "crypto";
import { createRazorpayOrder } from "./razorpay";
import {
  getAgentTrust,
  getTrustTier,
  computeEffectiveThreshold,
  updateAgentTrustOnTransaction,
} from "./agentTrust";
import { calculateTodayApprovedSpend } from "@shared/api";
import { getActiveCampaign, applyCampaignOverride } from "./campaigns";

export const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

// Sequential lock to guarantee monotonic timestamps and race-condition-free cryptographic hash chaining
let chainWriteQueue: Promise<any> = Promise.resolve();

export function withChainLock<T>(fn: () => Promise<T>): Promise<T> {
  const nextTask = chainWriteQueue.then(async () => {
    return await fn();
  });
  chainWriteQueue = nextTask.catch(() => {});
  return nextTask;
}

export const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  "Electronics": ["Electronics", "Fashion", "Accessories"],
  "Fashion": ["Fashion", "Electronics", "Accessories"],
  "Home & Kitchen": ["Home & Kitchen", "Groceries"],
  "Groceries": ["Groceries", "Home & Kitchen"],
};

export async function getMerchantTodayApprovedSpend(merchantId: string): Promise<number> {
  const todayStr = new Date().toISOString().split("T")[0];
  const spendRef = collection(db, `merchants/${merchantId}/dailySpend`);
  const snap = await getDocs(spendRef);
  let total = 0;
  snap.forEach((d) => {
    const data = d.data();
    if (data.date === todayStr || d.id.endsWith(`_${todayStr}`)) {
      total += Number(data.amount || 0);
    }
  });
  return total;
}

export async function resetMerchantDailySpend(
  merchantId: string = "demo_merchant"
): Promise<{ deletedCount: number; deletedIds: string[]; merchantId: string }> {
  const todayStr = new Date().toISOString().split("T")[0];
  const spendRef = collection(db, `merchants/${merchantId}/dailySpend`);
  const snap = await getDocs(spendRef);

  const deletedIds: string[] = [];
  const deletePromises: Promise<void>[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;
    // Strictly target today's dailySpend records only - do NOT touch past days!
    if (data.date === todayStr || id.endsWith(`_${todayStr}`)) {
      deletedIds.push(id);
      deletePromises.push(deleteDoc(doc(db, `merchants/${merchantId}/dailySpend/${id}`)));
    }
  });

  await Promise.all(deletePromises);
  return { deletedCount: deletedIds.length, deletedIds, merchantId };
}

export function computeTxnHash(
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
): string {
  const timeVal = data.timestamp || data.time || "";
  const agentVal = data.agentId || data.agent || "";
  const prodVal = data.productId || data.product || "";
  const amountVal = Number(data.requestedAmount ?? data.amount ?? 0);
  const decisionVal = data.decision || "";
  const reasonVal = data.reason || "";
  const payload = `${prevHash}|${timeVal}|${agentVal}|${prodVal}|${amountVal}|${decisionVal}|${reasonVal}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function computeOutcomeUpdateHash(
  prevHash: string,
  data: {
    timestamp?: string;
    time?: string;
    relatedTransactionId: string;
    outcome: string;
    reason: string;
  }
): string {
  const timeVal = data.timestamp || data.time || "";
  const payload = `${prevHash}|${timeVal}|outcome_update|${data.relatedTransactionId}|${data.outcome}|${data.reason}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function evaluatePurchaseRequest(
  merchantId: string, 
  agentId: string, 
  productId: string, 
  requestedAmount: number,
  overrideDecision?: "approved" | "blocked",
  isRecoveryAcceptance?: boolean,
  isEnhanceAcceptance?: boolean,
  skipEnhance?: boolean
) {
  // 1. Fetch rules, product, agent trust profile, and active campaign FRESH from Firestore server
  const rulesRef = doc(db, `merchants/${merchantId}/rules/current`);
  const productRef = doc(db, `merchants/${merchantId}/catalog/${productId}`);
  
  const [rulesSnap, productSnap, agentTrust, activeCampaign] = await Promise.all([
    getDocFromServer(rulesRef),
    getDocFromServer(productRef),
    getAgentTrust(merchantId, agentId),
    getActiveCampaign(merchantId),
  ]);

  if (!rulesSnap.exists()) {
    throw new Error(`Rules not found for merchant ${merchantId}`);
  }
  if (!productSnap.exists()) {
    throw new Error(`Product not found: ${productId}`);
  }

  const baseRules = rulesSnap.data();
  const product = productSnap.data();

  // Apply Campaign Orchestrator overrides on top of base rules (enforcing strict 20% safety ceiling)
  const { effectiveRules, campaignApplied } = applyCampaignOverride(baseRules, activeCampaign);
  const rules = effectiveRules;

  // Compute trust tier and adaptive effective threshold
  const trustTier = getTrustTier(agentTrust.score);
  const { effectiveThreshold, isRelaxed, isStrict } = computeEffectiveThreshold(
    agentTrust.score,
    Number(rules.approvalThreshold || 0),
    Number(rules.maxOrderAmount || 0)
  );

  let decision: "approved" | "recovered" | "escalated" | "blocked" | "enhanced";
  let reason: string;
  let recoveryProduct: any = undefined;
  let enhancedProduct: any = undefined;

  // Real-time merchant-wide spend for today across all completed transactions
  const todaySpent = await getMerchantTodayApprovedSpend(merchantId);

  if (overrideDecision) {
    decision = overrideDecision;
    reason = overrideDecision === "approved" ? "Approved by merchant" : "Manually denied by merchant";
  } else if (isEnhanceAcceptance) {
    decision = "approved";
    reason = `Accepted enhance offer — purchased ${product.name} at ₹${requestedAmount.toLocaleString("en-IN")}`;
  } else {
    // 2. Check category allow-list (HARD LIMIT - NEVER overridden by trust score)
    const allowed = Array.isArray(rules.allowedCategories)
      ? rules.allowedCategories.map((c: any) => String(c || "").trim().toLowerCase())
      : [];
    const productCat = String(product.category || "").trim().toLowerCase();

    if (!allowed.includes(productCat)) {
      decision = "blocked";
      reason = `Blocked — Category '${product.category}' not in merchant's allow-list (agent trust ${agentTrust.score}, ${trustTier})`;
    } 
    // 3. Check per-order cap (HARD LIMIT - NEVER overridden by trust score)
    else if (requestedAmount > rules.maxOrderAmount) {
      // Query catalog for real same-category items under the cap
      const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
      const q = query(
        catalogRef,
        where("category", "==", product.category)
      );
      const altSnaps = await getDocs(q);
      
      let bestMatch: any = null;
      let minDiff = Infinity;
      altSnaps.forEach(snap => {
        const altData: any = { id: snap.id, ...snap.data() };
        if (altData.price <= rules.maxOrderAmount && altData.id !== productId) {
          const diff = Math.abs(requestedAmount - altData.price);
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = altData;
          }
        }
      });

      if (!bestMatch) {
        decision = "blocked";
        reason = `Blocked — Exceeds per-order limit of ₹${rules.maxOrderAmount}, no in-budget alternative found (agent trust ${agentTrust.score}, ${trustTier})`;
      } else {
        decision = "recovered";
        reason = `Recovery offer — Requested amount ₹${requestedAmount} exceeds per-order cap of ₹${rules.maxOrderAmount} (agent trust ${agentTrust.score}, ${trustTier}). Suggested alternative: ${bestMatch.name} (₹${bestMatch.price})`;
        recoveryProduct = bestMatch;
      }
    } 
    else {
      // 4. Check daily spend limit (HARD LIMIT - NEVER overridden by trust score)
      if (todaySpent + requestedAmount > rules.dailySpendLimit) {
        decision = "blocked";
        reason = `Would exceed daily spend limit of ₹${rules.dailySpendLimit}`;
      } 
      // 5. Check approval threshold (ADAPTIVE - modulated by agent trust score)
      else if (
        !(requestedAmount <= rules.maxOrderAmount && requestedAmount > baseRules.maxOrderAmount && agentTrust.score >= 30) &&
        requestedAmount > effectiveThreshold
      ) {
        decision = "escalated";
        if (isStrict) {
          reason = `Escalated — agent trust ${agentTrust.score} (${trustTier}), all purchases require approval`;
        } else {
          reason = `Escalated — agent trust ${agentTrust.score} (${trustTier}), above ₹${effectiveThreshold} approval threshold, awaiting merchant review`;
        }
      } 
      // 6. Approve (Within all limits and approval threshold)
      else {
        decision = "approved";
        if (requestedAmount > baseRules.maxOrderAmount && requestedAmount <= rules.maxOrderAmount) {
          const expStr = activeCampaign?.expiresAt ? `, active until ${new Date(activeCampaign.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
          reason = `Approved — within campaign-adjusted cap of ₹${Number(rules.maxOrderAmount).toLocaleString("en-IN")} (base ₹${Number(baseRules.maxOrderAmount).toLocaleString("en-IN")}${expStr})`;
        } else if (requestedAmount > baseRules.approvalThreshold && requestedAmount <= rules.approvalThreshold) {
          reason = `Approved — within campaign-adjusted approval threshold of ₹${Number(rules.approvalThreshold).toLocaleString("en-IN")} (base ₹${Number(baseRules.approvalThreshold).toLocaleString("en-IN")})`;
        } else if (todaySpent + requestedAmount > baseRules.dailySpendLimit && todaySpent + requestedAmount <= rules.dailySpendLimit) {
          reason = `Approved — within campaign-adjusted daily limit of ₹${Number(rules.dailySpendLimit).toLocaleString("en-IN")} (base ₹${Number(baseRules.dailySpendLimit).toLocaleString("en-IN")})`;
        } else if (isRelaxed && requestedAmount > rules.approvalThreshold) {
          reason = `Approved — agent trust ${agentTrust.score} (${trustTier}), relaxed threshold applied (₹${effectiveThreshold})`;
        } else {
          reason = `Approved — agent trust ${agentTrust.score} (${trustTier}), within policy limits`;
        }
      }
    }
  }

  // Feature 1: "Enhance" outcome (Upsell / Cross-sell)
  // When a request would auto-approve AND amount is under 50% of the merchant's max order cap
  // and user is not already accepting or declining/skipping enhance
  if (
    decision === "approved" &&
    !overrideDecision &&
    !isRecoveryAcceptance &&
    !isEnhanceAcceptance &&
    !skipEnhance &&
    requestedAmount < rules.maxOrderAmount * 0.5
  ) {
    const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
    const catSnap = await getDocs(catalogRef);
    const candidateList: any[] = [];

    const currentCat = String(product.category || "").trim().toLowerCase();
    const compCats = (COMPLEMENTARY_CATEGORIES[product.category] || [product.category]).map(c => c.toLowerCase());

    catSnap.forEach((d) => {
      const p = { id: d.id, ...d.data() } as any;
      if (p.id === productId) return;
      if (!p.price || p.price <= requestedAmount) return; // Must be priced higher
      if (p.price > rules.maxOrderAmount) return; // Must be within max order cap
      if (todaySpent + p.price > rules.dailySpendLimit) return; // Must be within daily spend limit

      const prodCat = String(p.category || "").trim().toLowerCase();
      if (prodCat === currentCat || compCats.includes(prodCat)) {
        candidateList.push(p);
      }
    });

    if (candidateList.length > 0) {
      candidateList.sort((a, b) => {
        // Prioritize same-category upsell, then closest higher price
        const aSame = a.category === product.category ? 0 : 1;
        const bSame = b.category === product.category ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return a.price - b.price;
      });

      enhancedProduct = candidateList[0];
      decision = "enhanced";
      reason = `Enhance offer: upgrade to ${enhancedProduct.name} (₹${enhancedProduct.price}) within policy limits`;
    }
  }

  // Moment of Payment Check:
  // Before approving ANY transaction (auto-approved, accepted recovery, or approved escalation),
  // recalculate today's total approved spend for the merchant fresh from server and confirm
  // (liveTodaySpent + requestedAmount) <= rules.dailySpendLimit.
  // If this would exceed the limit, the result MUST be "blocked" with reason
  // "Would exceed daily spend limit of ₹<limit>" — even if every other check passed.
  if (decision === "approved") {
    const liveTodaySpent = await getMerchantTodayApprovedSpend(merchantId);
    if (liveTodaySpent + requestedAmount > Number(rules.dailySpendLimit || 0)) {
      decision = "blocked";
      reason = `Would exceed daily spend limit of ₹${rules.dailySpendLimit}`;
      recoveryProduct = undefined;
      enhancedProduct = undefined;
    }
  }

  // 7. Hash Chaining & Writing Transaction Document
  const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
  const txnData: any = {
    agent: agentId,
    agentId,
    product: product.name,
    productId,
    amount: requestedAmount,
    requestedAmount,
    decision,
    reason,
    agentTrustScore: agentTrust.score,
    agentTrustTier: trustTier,
    effectiveThreshold,
  };
  
  if (decision === "recovered" && recoveryProduct) {
    txnData.savedAmount = requestedAmount - recoveryProduct.price;
    txnData.alternativeProduct = recoveryProduct.name;
    txnData.alternativePrice = recoveryProduct.price;
  }
  
  if (decision === "approved") {
    try {
      const order = await createRazorpayOrder(requestedAmount, product.name);
      txnData.orderId = order.id;
      txnData.status = "completed";
      txnData.razorpayOrderId = order.id;
    } catch (err: any) {
      txnData.status = "failed";
      txnData.errorReason = err.message || "Razorpay API error";
    }
  } else if (decision === "escalated" || decision === "enhanced") {
    txnData.status = "pending";
  } else if (decision === "blocked") {
    txnData.status = "denied";
  }

  if (decision === "enhanced" && enhancedProduct) {
    txnData.enhancedProduct = enhancedProduct.name;
    txnData.enhancedPrice = enhancedProduct.price;
    txnData.enhancedProductId = enhancedProduct.id;
  }

  if (campaignApplied) {
    txnData.campaignApplied = campaignApplied.title;
    txnData.campaignId = campaignApplied.id;
  }

  // 7. Atomic Hash Chaining & Writing Transaction Document under Chain Lock
  const { docRef, prevHash, hash } = await withChainLock(async () => {
    const txnsRef = collection(db, `merchants/${merchantId}/transactions`);
    const lastTxnQuery = query(txnsRef, orderBy("time", "desc"), limit(1));
    const lastTxnSnap = await getDocs(lastTxnQuery);
    
    let prev = GENESIS_HASH;
    let lastTimeMs = 0;
    if (!lastTxnSnap.empty) {
      const lastDoc = lastTxnSnap.docs[0].data();
      prev = lastDoc.hash || GENESIS_HASH;
      const lastTimeStr = lastDoc.timestamp || lastDoc.time;
      if (lastTimeStr) {
        lastTimeMs = new Date(lastTimeStr).getTime();
      }
    }

    // Guarantee strictly monotonically increasing timestamp
    const nowMs = Math.max(Date.now(), lastTimeMs + 1);
    const monotonicTime = new Date(nowMs).toISOString();
    txnData.time = monotonicTime;
    txnData.timestamp = monotonicTime;

    const computedHash = computeTxnHash(prev, txnData);
    const finalTxn = {
      ...txnData,
      prevHash: prev,
      hash: computedHash,
    };

    const createdRef = await addDoc(txnsRef, finalTxn);
    return { docRef: createdRef, prevHash: prev, hash: computedHash };
  });

  // 8. Update daily spend document if approved
  if (decision === "approved") {
    const dateKey = new Date().toISOString().split("T")[0];
    const dailySpendRef = doc(db, `merchants/${merchantId}/dailySpend/${agentId}_${dateKey}`);
    const spendSnap = await getDoc(dailySpendRef);
    const currentSpent = spendSnap.exists() ? Number(spendSnap.data()?.amount || 0) : 0;
    const currentCount = spendSnap.exists() ? Number(spendSnap.data()?.count || 0) : 0;

    await setDoc(
      dailySpendRef,
      {
        agentId,
        date: dateKey,
        amount: currentSpent + requestedAmount,
        count: currentCount + 1,
        updatedAt: txnData.time,
      },
      { merge: true }
    );
  }

  // 9. Update Agent Trust score based on transaction outcome
  let updatedTrust = agentTrust;
  try {
    if (decision === "approved") {
      const eventType = isRecoveryAcceptance ? "accepted_recovery" : "approved";
      updatedTrust = await updateAgentTrustOnTransaction(merchantId, agentId, eventType);
    } else if (decision === "blocked") {
      updatedTrust = await updateAgentTrustOnTransaction(merchantId, agentId, "blocked");
    }
  } catch (err) {
    console.error(`Failed to update agent trust score for ${agentId}:`, err);
  }

  return {
    decision,
    reason,
    recoveryProduct,
    enhancedProduct,
    campaignApplied: campaignApplied?.title,
    status: txnData.status,
    orderId: txnData.orderId,
    razorpayOrderId: txnData.razorpayOrderId,
    errorReason: txnData.errorReason,
    transactionId: docRef.id,
    time: txnData.time,
    hash,
    prevHash,
    agentTrustScore: updatedTrust.score,
    agentTrustTier: getTrustTier(updatedTrust.score),
    effectiveThreshold,
  };
}

export async function alignCompleteChain(merchantId: string = "demo_merchant"): Promise<{ updatedCount: number; totalBlocks: number }> {
  return await withChainLock(async () => {
    const txnsQuery = query(collection(db, `merchants/${merchantId}/transactions`), orderBy("time", "desc"));
    const snap = await getDocs(txnsQuery);
    const chain = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse() as any[];

    let currentPrev = GENESIS_HASH;
    let updatedCount = 0;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      let canonicalHash: string;
      if (block.type === "outcome_update") {
        canonicalHash = computeOutcomeUpdateHash(currentPrev, {
          timestamp: block.timestamp || block.time,
          relatedTransactionId: block.relatedTransactionId,
          outcome: block.outcome,
          reason: block.reason,
        });
      } else {
        canonicalHash = computeTxnHash(currentPrev, {
          time: block.time,
          timestamp: block.timestamp,
          agent: block.agent,
          agentId: block.agentId,
          product: block.product,
          productId: block.productId,
          amount: block.amount,
          requestedAmount: block.requestedAmount,
          decision: block.decision,
          reason: block.reason,
        });
      }

      const needsUpdate = (block.prevHash !== currentPrev) || (block.hash !== canonicalHash);
      if (needsUpdate) {
        await updateDoc(doc(db, `merchants/${merchantId}/transactions`, block.id), {
          prevHash: currentPrev,
          hash: canonicalHash,
        });
        updatedCount++;
      }

      currentPrev = canonicalHash;
    }

    return { updatedCount, totalBlocks: chain.length };
  });
}
