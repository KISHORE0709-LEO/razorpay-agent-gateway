import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { ApprovalItem, AuditEntry, Decision, Product, Rules } from "./types";
import { db } from "./firebase";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { calculateTodayApprovedSpend } from "@shared/api";
import { apiUrl } from "./api";

export const AGENT_ID = "agt_live_7f3c9e";

const DEFAULT_RULES: Rules = {
  maxOrder: 5000,
  dailyLimit: 20000,
  categories: ["Electronics", "Fashion", "Home & Kitchen", "Groceries"],
  approvalAbove: 2000,
  maxDiscount: 10,
};

export interface SubmitResult {
  decision: Decision;
  reason: string;
  alternative?: Product;
  enhancedProduct?: Product;
  campaignApplied?: string;
  entry?: AuditEntry;
  approval?: ApprovalItem;
  transactionId?: string;
  orderId?: string;
  status?: string;
  errorReason?: string;
  parsedProduct?: Product;
  suggestions?: Product[];
  conversationalReply?: string;
  time?: string;
  priceNote?: string;
}

export interface FirewallStore {
  isLoggedIn: boolean;
  merchantEmail: string | null;
  setMerchantEmail: (email: string) => void;
  login: (email: string) => void;
  logout: () => void;

  rules: Rules;
  setRules: (rules: Rules) => void;

  auditLog: AuditEntry[];
  approvals: any[];
  dailySpent: number;
  resolveApproval: (id: string, approve: boolean) => Promise<SubmitResult | undefined>;

  submitRequest: (
    product: Product,
    isRecoveryAcceptance?: boolean,
    isEnhanceAcceptance?: boolean,
    skipEnhance?: boolean
  ) => Promise<SubmitResult>;
  sendChatRequest: (message: string) => Promise<SubmitResult>;

  latestDecision: Decision | null;
  latestTxnId: string | null;
}

const FirewallContext = createContext<FirewallStore | null>(null);

export function FirewallProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [merchantEmail, setMerchantEmail] = useState<string | null>("demo@razorpay.com");
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  const latestDecision = auditLog[0]?.decision || null;
  const latestTxnId = auditLog[0]?.id || null;

  useEffect(() => {
    const txnsRef = collection(db, "merchants/demo_merchant/transactions");

    const unsubTxns = onSnapshot(
      txnsRef,
      (snap) => {
        // Collect IDs of transactions that have received an outcome_update
        const resolvedTxnIds = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.type === "outcome_update" && data.relatedTransactionId) {
            resolvedTxnIds.add(data.relatedTransactionId);
          }
        });

        // Pending approvals: escalated transactions that have not yet been resolved
        const pendingItems = snap.docs
          .filter((d) => {
            const data = d.data();
            return data.decision === "escalated" && !resolvedTxnIds.has(d.id);
          })
          .map((d) => ({ id: d.id, ...d.data() } as any));
        pendingItems.sort(
          (a, b) =>
            new Date(b.time || b.timestamp || 0).getTime() -
            new Date(a.time || a.timestamp || 0).getTime()
        );
        setApprovals(pendingItems);

        // Full Verdict Chain (all transactions and outcome updates in chronological order)
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry));
        items.sort(
          (a, b) =>
            new Date(b.time || b.timestamp || 0).getTime() -
            new Date(a.time || a.timestamp || 0).getTime()
        );
        setAuditLog(items);
      },
      (err) => {
        console.warn("Transactions snapshot warning:", err);
      }
    );

    return () => {
      unsubTxns();
    };
  }, []);

  useEffect(() => {
    const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
    const unsub = onSnapshot(
      rulesRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRules({
            maxOrder: data.maxOrderAmount ?? DEFAULT_RULES.maxOrder,
            dailyLimit: data.dailySpendLimit ?? DEFAULT_RULES.dailyLimit,
            categories: data.allowedCategories ?? DEFAULT_RULES.categories,
            approvalAbove: data.approvalThreshold ?? DEFAULT_RULES.approvalAbove,
            maxDiscount: data.maxDiscountPercent ?? DEFAULT_RULES.maxDiscount,
          });
        }
      },
      (error) => {
        console.error("Rules snapshot listener error:", error);
      }
    );

    return () => unsub();
  }, []);

  const dailySpent = useMemo(
    () => calculateTodayApprovedSpend(auditLog),
    [auditLog],
  );

  const login = useCallback((email: string) => {
    sessionStorage.setItem("sentrypay-session", "active");
    sessionStorage.setItem("sentrypay-email", email);
    setMerchantEmail(email);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("sentrypay-session");
    sessionStorage.removeItem("sentrypay-email");
    setIsLoggedIn(false);
    setMerchantEmail(null);
  }, []);

  const submitRequest = useCallback(
    async (
      product: Product,
      isRecoveryAcceptance?: boolean,
      isEnhanceAcceptance?: boolean,
      skipEnhance?: boolean,
    ): Promise<SubmitResult> => {
      try {
        const response = await fetch(apiUrl("/api/evaluate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId: "demo_merchant",
            agentId: AGENT_ID,
            productId: product.id,
            requestedAmount: product.price,
            isRecoveryAcceptance: !!isRecoveryAcceptance,
            isEnhanceAcceptance: !!isEnhanceAcceptance,
            skipEnhance: !!skipEnhance,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        const orderId = result.orderId || result.razorpayOrderId;
        
        const mappedResult: SubmitResult = {
          decision: result.decision,
          reason: result.reason,
          alternative: result.recoveryProduct,
          enhancedProduct: result.enhancedProduct,
          campaignApplied: result.campaignApplied,
          transactionId: result.transactionId,
          orderId,
          status: result.status,
          errorReason: result.errorReason,
          parsedProduct: product,
          entry: {
            id: result.transactionId || "",
            time: new Date().toISOString(),
            agent: AGENT_ID,
            product: product.name,
            amount: product.price,
            decision: result.decision,
            reason: result.reason,
            hash: "",
            prevHash: "",
            orderId,
            status: result.status,
            agentTrustScore: result.agentTrustScore,
            agentTrustTier: result.agentTrustTier,
            enhancedProduct: result.enhancedProduct,
            campaignApplied: result.campaignApplied,
          },
        };

        if (result.decision === "escalated") {
          const approval: ApprovalItem = {
            id: result.transactionId || `apr_${Math.random().toString(36).slice(2, 10)}`,
            time: new Date().toISOString(),
            agent: AGENT_ID,
            product,
            amount: product.price,
            reason: result.reason,
            agentTrustScore: result.agentTrustScore,
            agentTrustTier: result.agentTrustTier,
          };
          mappedResult.approval = approval;
        }

        return mappedResult;
      } catch (err) {
        console.error(err);
        return { decision: "blocked", reason: "Error connecting to firewall" };
      }
    },
    [],
  );

  const sendChatRequest = useCallback(
    async (message: string): Promise<SubmitResult> => {
      try {
        const response = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId: "demo_merchant",
            agentId: AGENT_ID,
            message: message,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();

        // 1. Conversational greeting or non-purchase message
        if (result.decision === "conversational") {
          return {
            decision: "conversational",
            reason: result.message || "Hello! How can I help you?",
            conversationalReply: result.message
          };
        }

        // 2. Product not found in catalog (neutral outcome, no transaction logged)
        if (result.decision === "not_found") {
          return {
            decision: "not_found",
            reason: result.reason || "I couldn't find a matching product — try one of our catalog items below:",
            suggestions: result.suggestions || []
          };
        }

        const product = result.parsedProduct;
        const orderId = result.orderId || result.razorpayOrderId;
        
        const mappedResult: SubmitResult = {
          decision: result.decision,
          reason: result.reason,
          alternative: result.recoveryProduct,
          enhancedProduct: result.enhancedProduct,
          campaignApplied: result.campaignApplied,
          transactionId: result.transactionId,
          orderId,
          status: result.status,
          errorReason: result.errorReason,
          parsedProduct: product,
          time: result.time || new Date().toISOString(),
          priceNote: result.priceNote,
          entry: product ? {
            id: result.transactionId || "",
            time: result.time || new Date().toISOString(),
            agent: AGENT_ID,
            product: product.name,
            amount: result.requestedAmount || product.price,
            decision: result.decision,
            reason: result.reason,
            hash: result.hash || "",
            prevHash: result.prevHash || "",
            orderId,
            status: result.status,
            enhancedProduct: result.enhancedProduct,
            campaignApplied: result.campaignApplied,
          } : undefined,
        };

        if (result.decision === "escalated" && product) {
          const approval: ApprovalItem = {
            id: result.transactionId || `apr_${Math.random().toString(36).slice(2, 10)}`,
            time: new Date().toISOString(),
            agent: AGENT_ID,
            product,
            amount: result.requestedAmount || product.price,
            reason: result.reason,
          };
          mappedResult.approval = approval;
        }

        return mappedResult;
      } catch (err) {
        console.error(err);
        return { decision: "blocked", reason: "Error connecting to firewall" };
      }
    },
    [],
  );

  const resolveApproval = useCallback(
    async (id: string, approve: boolean): Promise<SubmitResult | undefined> => {
      try {
        const res = await fetch(apiUrl("/api/resolve"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: id, approve }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || errData.reason || "Failed to resolve approval";
          console.error("Failed to resolve approval:", errMsg);
          alert(errMsg);
        }
        return undefined; // Real-time UI will update via Firestore listeners
      } catch (err) {
        console.error("Error resolving approval:", err);
        return undefined;
      }
    },
    [],
  );

  const value: FirewallStore = {
    isLoggedIn,
    merchantEmail,
    setMerchantEmail,
    login,
    logout,
    rules,
    setRules,
    auditLog,
    approvals,
    dailySpent,
    submitRequest,
    sendChatRequest,
    resolveApproval,
    latestDecision,
    latestTxnId,
  };

  return (
    <FirewallContext.Provider value={value}>
      {children}
    </FirewallContext.Provider>
  );
}

export function useFirewall() {
  const ctx = useContext(FirewallContext);
  if (!ctx) throw new Error("useFirewall must be used within FirewallProvider");
  return ctx;
}
