import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { evaluateRequest } from "./firewall";
import { GENESIS_HASH, nextHash } from "./hash";
import { ApprovalItem, AuditEntry, Decision, Product, Rules } from "./types";

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
}

interface FirewallStore {
  isLoggedIn: boolean;
  merchantEmail: string | null;
  login: (email: string) => void;
  logout: () => void;

  rules: Rules;
  setRules: (rules: Rules) => void;

  auditLog: AuditEntry[];
  approvals: ApprovalItem[];
  dailySpent: number;

  submitRequest: (product: Product) => SubmitResult;
  resolveApproval: (id: string, approve: boolean) => SubmitResult | undefined;
}

const FirewallContext = createContext<FirewallStore | null>(null);

export function FirewallProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState<string | null>(null);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  const auditLogRef = useRef(auditLog);
  auditLogRef.current = auditLog;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const dailySpent = useMemo(
    () =>
      auditLog
        .filter((e) => e.decision === "approved" && isToday(e.time))
        .reduce((sum, e) => sum + e.amount, 0),
    [auditLog],
  );
  const dailySpentRef = useRef(dailySpent);
  dailySpentRef.current = dailySpent;

  const login = useCallback((email: string) => {
    setMerchantEmail(email);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setMerchantEmail(null);
  }, []);

  const appendAuditEntry = useCallback(
    (product: Product, decision: Decision, reason: string): AuditEntry => {
      const prevHash = auditLogRef.current[0]?.hash ?? GENESIS_HASH;
      const base = {
        time: new Date().toISOString(),
        agent: AGENT_ID,
        product: product.name,
        amount: product.price,
        decision,
        reason,
        orderId: decision === "approved" ? randomOrderId() : undefined,
      };
      const hash = nextHash(prevHash, base);
      const entry: AuditEntry = { id: hash, prevHash, hash, ...base };
      setAuditLog((log) => [entry, ...log]);
      return entry;
    },
    [],
  );

  const submitRequest = useCallback(
    (product: Product): SubmitResult => {
      const result = evaluateRequest(
        product,
        rulesRef.current,
        dailySpentRef.current,
      );

      if (result.decision === "approved") {
        const entry = appendAuditEntry(product, "approved", result.reason);
        return { ...result, entry };
      }

      if (result.decision === "blocked") {
        const entry = appendAuditEntry(product, "blocked", result.reason);
        return { ...result, entry };
      }

      if (result.decision === "escalated") {
        const approval: ApprovalItem = {
          id: `apr_${Math.random().toString(36).slice(2, 10)}`,
          time: new Date().toISOString(),
          agent: AGENT_ID,
          product,
          amount: product.price,
          reason: result.reason,
        };
        setApprovals((list) => [approval, ...list]);
        return { ...result, approval };
      }

      // recovered: no side effects yet, chat surfaces an accept/decline card.
      return result;
    },
    [appendAuditEntry],
  );

  const resolveApproval = useCallback(
    (id: string, approve: boolean): SubmitResult | undefined => {
      const item = approvals.find((a) => a.id === id);
      if (!item) return undefined;
      setApprovals((list) => list.filter((a) => a.id !== id));

      if (approve) {
        const entry = appendAuditEntry(item.product, "approved", "Approved by merchant");
        return { decision: "approved", reason: "Approved by merchant", entry };
      }
      const entry = appendAuditEntry(
        item.product,
        "blocked",
        "Manually denied by merchant",
      );
      return { decision: "blocked", reason: "Manually denied by merchant", entry };
    },
    [approvals, appendAuditEntry],
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
