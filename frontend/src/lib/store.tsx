import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { evaluateRequest } from "./firewall";
import { GENESIS_HASH, nextHash } from "./hash";
import { ApprovalItem, AuditEntry, Decision, Product, Rules } from "./types";
import { db } from "./firebase";
import { doc, getDoc, query, collection, where, orderBy, onSnapshot } from "firebase/firestore";

export const AGENT_ID = "agt_live_7f3c9e";

const DEFAULT_RULES: Rules = {
  maxOrder: 5000,
  dailyLimit: 20000,
  categories: ["Electronics"],
  approvalAbove: 2000,
  maxDiscount: 10,
};

function randomOrderId() {
  return `order_${Math.random().toString(36).slice(2, 11)}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export interface SubmitResult {
  decision: Decision;
  reason: string;
  alternative?: Product;
  entry?: AuditEntry;
  approval?: ApprovalItem;
  transactionId?: string;
}

export interface FirewallStore {
  isLoggedIn: boolean;
  merchantEmail: string | null;
  login: (email: string) => void;
  logout: () => void;

  rules: Rules;
  setRules: (rules: Rules) => void;

  auditLog: AuditEntry[];
  approvals: any[];
  dailySpent: number;

  submitRequest: (product: Product) => Promise<SubmitResult>;
  sendChatRequest: (message: string) => Promise<SubmitResult>;
  resolveApproval: (id: string, approve: boolean) => Promise<SubmitResult | undefined>;
}

const FirewallContext = createContext<FirewallStore | null>(null);

export function FirewallProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem("sentrypay-session") === "active");
  const [merchantEmail, setMerchantEmail] = useState<string | null>(() => sessionStorage.getItem("sentrypay-email"));
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    const txnsRef = collection(db, "merchants/demo_merchant/transactions");
    
    // Listener for approvals
    const qApprovals = query(
      txnsRef,
      where("decision", "==", "escalated"),
      where("status", "==", "pending"),
      orderBy("time", "desc")
    );
    const unsubApprovals = onSnapshot(qApprovals, (snap) => {
      setApprovals(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Listener for audit trail
    const qAudit = query(txnsRef, orderBy("time", "desc"));
    const unsubAudit = onSnapshot(qAudit, (snap) => {
      setAuditLog(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditEntry)));
    });

    return () => {
      unsubApprovals();
      unsubAudit();
    };
  }, []);

  useEffect(() => {
    async function loadRules() {
      try {
        const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
        const snap = await getDoc(rulesRef);
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
      } catch (error) {
        console.error("Failed to load rules from Firestore:", error);
      }
    }
    loadRules();
  }, []);

  const dailySpent = useMemo(
    () =>
      auditLog
        .filter((e) => e.decision === "approved" && isToday(e.time))
        .reduce((sum, e) => sum + e.amount, 0),
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
    async (product: Product): Promise<SubmitResult> => {
      try {
        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId: "demo_merchant",
            agentId: AGENT_ID,
            productId: product.id,
            requestedAmount: product.price,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        
        const mappedResult: SubmitResult = {
          decision: result.decision,
          reason: result.reason,
          alternative: result.recoveryProduct,
        };

        if (result.decision === "approved" || result.decision === "blocked") {
          return mappedResult;
        }

        if (result.decision === "escalated") {
          const approval: ApprovalItem = {
            id: result.transactionId || `apr_${Math.random().toString(36).slice(2, 10)}`,
            time: new Date().toISOString(),
            agent: AGENT_ID,
            product,
            amount: product.price,
            reason: result.reason,
          };

          return { ...mappedResult, approval };
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
        const response = await fetch("/api/chat", {
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
        
        const mappedResult: SubmitResult = {
          decision: result.decision,
          reason: result.reason,
          alternative: result.recoveryProduct,
          transactionId: result.transactionId,
        };

        const product = result.parsedProduct;
        if (!product) return mappedResult; // blocked with no product

        if (result.decision === "approved" || result.decision === "blocked") {
          return mappedResult;
        }

        if (result.decision === "escalated") {
          const approval: ApprovalItem = {
            id: result.transactionId || `apr_${Math.random().toString(36).slice(2, 10)}`,
            time: new Date().toISOString(),
            agent: AGENT_ID,
            product,
            amount: product.price,
            reason: result.reason,
          };

          return { ...mappedResult, approval };
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
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: id, approve }),
        });
        if (!res.ok) {
          console.error("Failed to resolve approval:", await res.text());
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
