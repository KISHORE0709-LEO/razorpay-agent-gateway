import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, deleteDoc, getDocFromServer } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowUpRight,
  Ban,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PanelLeft,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/catalog";
import { AGENT_ID, useFirewall, SubmitResult } from "@/lib/store";
import { Decision, Product, Rules } from "@/lib/types";
import { GENESIS_HASH, computeTxnHash } from "@/lib/hash";
import {
  ChatMessage,
  ChatSession,
  createNewSessionObject,
  persistSession,
  subscribeSessions,
  removeSession,
} from "@/lib/sessions";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "rules", label: "Firewall Rules", icon: Settings2 },
  { id: "catalog", label: "Catalog", icon: Package },
  { id: "chat", label: "AI Buyer", icon: Bot },
  { id: "approvals", label: "Approval Queue", icon: Clock3 },
  { id: "audit", label: "Audit Trail", icon: Activity },
] as const;
type Tab = (typeof NAV)[number]["id"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, merchantEmail, logout } = useFirewall();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  function signOut() {
    logout();
    navigate("/");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-brand-navy text-white shadow-2xl shadow-brand-navy/30 transition-transform duration-300 ease-out", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue"><ShieldCheck className="h-4 w-4" /></div>
            <span className="font-semibold tracking-tight">Sentry<span className="text-brand-blue">Pay</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition" aria-label="Close sidebar"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Workspace</div>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setTab(item.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition", tab === item.id ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/15" : "text-white/55 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4 shrink-0" />{item.label}{item.id === "approvals" && <ApprovalCount />}</button>;
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/20 text-xs font-semibold text-brand-blue">{merchantEmail?.[0]?.toUpperCase() ?? "M"}</div><div className="min-w-0"><div className="truncate text-xs font-medium text-white">{merchantEmail}</div><div className="text-[10px] text-white/40">Merchant workspace</div></div></div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/45 transition hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <div className={cn("min-w-0 flex-1 transition-[padding] duration-300 ease-out flex flex-col h-full overflow-hidden", sidebarOpen ? "pl-72" : "pl-0")}>
        <header className="flex h-16 sm:h-20 shrink-0 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex items-center gap-1"><button onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-brand-navy" title={sidebarOpen ? "Close sidebar" : "Open sidebar"}><Menu className="h-4 w-4" /></button></div><div><h1 className="text-lg font-semibold capitalize">{tab === "chat" ? "AI Buyer" : tab === "rules" ? "Firewall Rules" : tab === "catalog" ? "Product Catalog" : tab === "audit" ? "Audit Trail" : tab === "approvals" ? "Approval Queue" : "Overview"}</h1></div></div>
          <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />System operational</div><div className="h-8 w-8 rounded-full bg-brand-blue/10 text-center text-xs leading-8 font-semibold text-brand-navy">{merchantEmail?.[0]?.toUpperCase() ?? "M"}</div></div>
        </header>
        <main className={cn("mx-auto w-full max-w-[1500px] flex-1 min-h-0", tab === "chat" ? "p-3 sm:p-4 lg:p-5 flex flex-col overflow-hidden" : "p-5 sm:p-8 overflow-y-auto")}>
          {tab === "overview" && <Overview onTab={setTab} />}
          {tab === "chat" && <BuyerChat />}
          {tab === "rules" && <RulesPanel />}
          {tab === "catalog" && <CatalogPanel />}
          {tab === "approvals" && <ApprovalsPanel />}
          {tab === "audit" && <AuditPanel />}
        </main>
      </div>
    </div>
  );
}

function ApprovalCount() { const { approvals } = useFirewall(); return approvals.length > 0 ? <span className="ml-auto rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-brand-navy">{approvals.length}</span> : null; }

function Overview({ onTab }: { onTab: (tab: Tab) => void }) {
  const { rules, dailySpent, auditLog, approvals } = useFirewall();
  
  const today = new Date().toDateString();
  const todayLog = auditLog.filter((e) => new Date(e.time).toDateString() === today);
  
  // Requests today: count of all transactions today
  const requestsToday = todayLog.length;
  
  // Approved volume: sum of approved transaction amounts today
  const approvedVolume = todayLog
    .filter((e) => e.decision === "approved" || e.status === "completed")
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Blocked requests: count of blocked transactions today
  const blockedToday = todayLog.filter((e) => e.decision === "blocked").length;
  
  // Daily spend progress bar
  const dailySpendProgress = Math.min((dailySpent / rules.dailyLimit) * 100, 100);
  
  // Saved via recovery: sum of savedAmount across recovered transactions today
  const savedViaRecovery = todayLog
    .filter((e) => e.decision === "recovered" && e.savedAmount)
    .reduce((sum, e) => sum + (e.savedAmount || 0), 0);

  // For the pulse animation, track the most recent transaction
  const latestTxnId = auditLog.length > 0 ? auditLog[0].id : null;
  const latestDecision = auditLog.length > 0 ? auditLog[0].decision : null;

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm text-muted-foreground">Good morning, merchant</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Your firewall at a glance</h2>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        LIVE • {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
    
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Stat label="Requests today" value={String(requestsToday).padStart(2, "0")} trend="Live stream" icon={Activity} color="blue" />
      <Stat label="Approved volume" value={`₹${approvedVolume.toLocaleString("en-IN")}`} trend={approvedVolume ? "Completed today" : "Awaiting first request"} icon={CheckCircle2} color="green" />
      <Stat label="Approval queue" value={String(approvals.length).padStart(2, "0")} trend={approvals.length ? "Needs attention" : "All clear"} icon={Clock3} color="amber" />
      <Stat label="Blocked requests" value={String(blockedToday).padStart(2, "0")} trend="Protected by rules" icon={Ban} color="red" />
      
      <div className="rounded-2xl border border-brand-blue/20 bg-card p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <RefreshCw className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Saved via recovery</span>
        </div>
        <div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-brand-navy">₹{savedViaRecovery.toLocaleString("en-IN")}</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${dailySpendProgress}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>₹{dailySpent.toLocaleString("en-IN")} spent</span>
            <span>Limit: ₹{rules.dailyLimit.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-brand-blue/20 bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-brand-navy">Firewall activity</h3>
            <p className="mt-1 text-xs text-muted-foreground">Every request passes through your policy engine</p>
          </div>
          <button onClick={() => onTab("chat")} className="text-xs font-semibold text-brand-blue hover:underline">
            Try a request <ChevronRight className="inline h-3 w-3" />
          </button>
        </div>
        <MiniFlow latestDecision={latestDecision} latestTxnId={latestTxnId} />
      </section>
      
      <section className="rounded-2xl border border-brand-blue/20 bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-brand-navy">Active policy</h3>
            <p className="mt-1 text-xs text-muted-foreground">Synchronized with Firestore rules/current</p>
          </div>
          <button onClick={() => onTab("rules")} className="text-xs font-semibold text-brand-blue hover:underline">Edit</button>
        </div>
        <div className="mt-6 space-y-4">
          <RuleLine label="Max order amount" value={`₹${rules.maxOrder.toLocaleString("en-IN")}`} />
          <RuleLine label="Daily spend limit" value={`₹${rules.dailyLimit.toLocaleString("en-IN")}`} />
          <RuleLine label="Approval threshold" value={`₹${rules.approvalAbove.toLocaleString("en-IN")}`} />
          <RuleLine label="Allowed categories" value={rules.categories.join(", ") || "None"} />
        </div>
      </section>
    </div>
    
    <section className="rounded-2xl border border-brand-blue/20 bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="font-semibold text-brand-navy">Recent decisions</h3>
          <p className="mt-1 text-xs text-muted-foreground">Live audit stream</p>
        </div>
        <button onClick={() => onTab("audit")} className="text-xs font-semibold text-brand-blue">
          View all <ChevronRight className="inline h-3 w-3" />
        </button>
      </div>
      {auditLog.length ? (
        <div className="divide-y divide-border">
          {auditLog.slice(0, 4).map((entry) => <AuditRow key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <EmptyState icon={Activity} text="No requests yet. Open AI Buyer to simulate your first purchase." action={() => onTab("chat")} actionLabel="Open AI Buyer" />
      )}
    </section>
  </div>;
}

function Stat({ label, value, trend, icon: Icon, color }: { label: string; value: string; trend: string; icon: typeof Activity; color: string }) {
  return (
    <div className="rounded-2xl border border-brand-blue/20 bg-card p-5 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color === "blue" ? "bg-brand-blue/10 text-brand-blue" : color === "green" ? "bg-success/10 text-success" : color === "amber" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div>
        <div className="mt-5 text-2xl font-bold font-mono tracking-tight text-brand-navy">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{trend}</div>
      </div>
    </div>
  );
}

function RuleLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono text-xs font-medium text-brand-navy">{value}</span></div> }

function MiniFlow({ latestDecision, latestTxnId }: { latestDecision: string | null, latestTxnId: string | null }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3">
      <FlowPill icon={Bot} label="AI Agent" />
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      
      <motion.div
        key={`firewall-${latestTxnId}`}
        initial={{ scale: 1.15, backgroundColor: "rgba(59, 130, 246, 0.2)" }}
        animate={{ scale: 1, backgroundColor: "transparent" }}
        transition={{ duration: 0.5 }}
      >
        <FlowPill icon={ShieldCheck} label="Firewall" active />
      </motion.div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [CheckCircle2, "Approved", "text-success", "border-success bg-success/15", "approved"],
          [RefreshCw, "Recovered", "text-brand-blue", "border-brand-blue bg-brand-blue/15", "recovered"],
          [Clock3, "Escalated", "text-warning", "border-warning bg-warning/15", "escalated"],
          [Ban, "Blocked", "text-destructive", "border-destructive bg-destructive/15", "blocked"]
        ].map(([Icon, label, color, activeClass, decision]) => {
          const isLatest = latestDecision === decision;
          return (
            <motion.div
              key={String(label)}
              animate={isLatest ? { scale: [1, 1.15, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 10px rgba(59, 130, 246, 0.3)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
              transition={{ duration: 0.6 }}
              className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2 transition-all", isLatest ? activeClass : "bg-muted border-transparent")}
            >
              <Icon className={cn("h-3.5 w-3.5", String(color))} />
              <span className={cn("text-[10px] font-medium", isLatest ? "font-bold text-brand-navy" : "")}>{String(label)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FlowPill({ icon: Icon, label, active }: { icon: typeof Bot; label: string; active?: boolean }) { return <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", active ? "border-brand-blue/30 bg-brand-blue/10 text-brand-blue" : "border-border bg-card text-muted-foreground")}><Icon className="h-3.5 w-3.5" /><span className="font-medium">{label}</span></div> }

function RulesPanel() {
  const { setRules } = useFirewall();
  const [draft, setDraft] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh read from Firestore server on mount — no stale cache or component defaults
  useEffect(() => {
    let active = true;
    async function fetchFreshRules() {
      setLoading(true);
      setError(null);
      try {
        const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
        let serverRules: Rules | null = null;
        try {
          const snap = await getDocFromServer(rulesRef);
          if (snap.exists()) {
            const data = snap.data();
            serverRules = {
              maxOrder: Number(data.maxOrderAmount ?? 5000),
              dailyLimit: Number(data.dailySpendLimit ?? 20000),
              categories: Array.isArray(data.allowedCategories) ? data.allowedCategories : ["Electronics", "Fashion", "Home & Kitchen", "Groceries"],
              approvalAbove: Number(data.approvalThreshold ?? 2000),
              maxDiscount: Number(data.maxDiscountPercent ?? 10),
            };
          }
        } catch (serverErr) {
          console.warn("Direct Firestore getDocFromServer fallback to /api/rules:", serverErr);
          const res = await fetch("/api/rules?merchantId=demo_merchant");
          if (res.ok) {
            const data = await res.json();
            serverRules = {
              maxOrder: Number(data.maxOrderAmount ?? 5000),
              dailyLimit: Number(data.dailySpendLimit ?? 20000),
              categories: Array.isArray(data.allowedCategories) ? data.allowedCategories : ["Electronics", "Fashion", "Home & Kitchen", "Groceries"],
              approvalAbove: Number(data.approvalThreshold ?? 2000),
              maxDiscount: Number(data.maxDiscountPercent ?? 10),
            };
          } else {
            throw new Error(`Failed to load fresh rules: ${res.statusText}`);
          }
        }

        if (active && serverRules) {
          setDraft(serverRules);
          setRules(serverRules);
        }
      } catch (err: any) {
        console.error("Error fetching fresh rules:", err);
        if (active) {
          setError(err?.message || "Failed to load rules fresh from server");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchFreshRules();
    return () => {
      active = false;
    };
  }, [setRules]);

  function update<K extends keyof Rules>(key: K, value: Rules[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : null));
    setSaved(false);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
      const rulesPayload = {
        maxOrderAmount: Number(draft.maxOrder),
        dailySpendLimit: Number(draft.dailyLimit),
        allowedCategories: draft.categories,
        approvalThreshold: Number(draft.approvalAbove),
        maxDiscountPercent: Number(draft.maxDiscount),
        updatedAt: new Date().toISOString(),
      };

      // 1. Direct write to Firestore
      await setDoc(rulesRef, rulesPayload, { merge: true });

      // 2. Also sync to backend API endpoint to ensure server-side cache invalidation and verify
      const apiRes = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: "demo_merchant",
          rules: rulesPayload,
        }),
      });

      if (!apiRes.ok) {
        const errData = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error ${apiRes.status}`);
      }

      setRules(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      console.error("Error saving rules:", err);
      setError(err?.message || "Failed to persist rules to Firestore");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-brand-blue/20 bg-card p-12 text-center">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-blue" />
        <p className="mt-4 text-sm font-medium text-brand-navy">Fetching fresh rules from Firestore...</p>
        <p className="mt-1 text-xs text-muted-foreground">Reading latest policy document directly from server</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Control what your agents can spend</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Firewall rules</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Server Synced
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Failed to save rules</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={save} className="rounded-2xl border border-brand-blue/20 bg-card p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <NumberField label="Max order amount" hint="Hard cap per transaction" value={draft.maxOrder} onChange={(v) => update("maxOrder", v)} />
          <NumberField label="Daily spend limit" hint="Across all AI agents" value={draft.dailyLimit} onChange={(v) => update("dailyLimit", v)} />
          <NumberField label="Approval threshold" hint="Orders above this need you" value={draft.approvalAbove} onChange={(v) => update("approvalAbove", v)} />
          <NumberField label="Maximum discount" hint="Allowed agent discount" value={draft.maxDiscount} suffix="%" onChange={(v) => update("maxDiscount", v)} />
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-brand-navy">Allowed categories</h3>
            <p className="mt-1 text-xs text-muted-foreground">Requests outside these categories are blocked automatically.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <label key={category} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition", draft.categories.includes(category) ? "border-brand-blue/40 bg-brand-blue/5 text-brand-navy font-medium" : "border-border text-muted-foreground")}>
                <input type="checkbox" checked={draft.categories.includes(category)} onChange={(e) => update("categories", e.target.checked ? [...draft.categories, category] : draft.categories.filter((c) => c !== category))} className="h-4 w-4 accent-brand-blue" />
                {category}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-end gap-4 border-t border-border pt-6">
          <span className={cn("flex items-center gap-1.5 text-xs font-medium text-success transition-opacity duration-200", saved ? "opacity-100" : "opacity-0")}>
            <Check className="h-4 w-4" />
            Rules saved successfully to Firestore!
          </span>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save rules"}
          </button>
        </div>
      </form>
      <div className="flex items-start gap-3 rounded-xl border border-brand-blue/15 bg-brand-blue/5 p-4 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
        These policies are evaluated in order for every incoming agent request: Category allow-list &rarr; Per-order cap &rarr; Daily spend limit &rarr; Approval threshold. Changes take effect immediately.
      </div>
    </div>
  );
}

function NumberField({ label, hint, value, suffix = "₹", onChange }: { label: string; hint: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-brand-navy">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      <div className="relative mt-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">{suffix}</span>
        <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full rounded-xl border border-border bg-background pl-8 pr-3 font-mono text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" />
      </div>
    </label>
  );
}

function CatalogPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form draft state
  const [form, setForm] = useState<{
    name: string;
    category: string;
    customCategory: string;
    price: string | number;
    stock: string | number;
    imageUrl: string;
  }>({
    name: "",
    category: "Electronics",
    customCategory: "",
    price: "",
    stock: "50",
    imageUrl: "",
  });

  // Delete modal state
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast message state
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const catalogRef = collection(db, "merchants/demo_merchant/catalog");
    const unsub = onSnapshot(
      catalogRef,
      (snap) => {
        const items = snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...d.data(),
            } as Product),
        );
        items.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to catalog in Firestore:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // Compute summary stats
  const totalProducts = products.length;
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    // Ensure default categories are available in dropdown
    CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [products]);

  const totalCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return set.size;
  }, [products]);

  const { minPrice, maxPrice, totalStock } = useMemo(() => {
    if (products.length === 0) return { minPrice: 0, maxPrice: 0, totalStock: 0 };
    let min = Infinity;
    let max = -Infinity;
    let stock = 0;
    products.forEach((p) => {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
      stock += p.stock ?? 0;
    });
    return {
      minPrice: min === Infinity ? 0 : min,
      maxPrice: max === -Infinity ? 0 : max,
      totalStock: stock,
    };
  }, [products]);

  const priceRange = products.length
    ? `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`
    : "₹0";

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === "All" || p.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCat]);

  function openAddModal() {
    setEditingItem(null);
    setForm({
      name: "",
      category: categories[0] || "Electronics",
      customCategory: "",
      price: "",
      stock: "50",
      imageUrl: "",
    });
    setModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingItem(prod);
    setForm({
      name: prod.name,
      category: categories.includes(prod.category) ? prod.category : "__CUSTOM__",
      customCategory: categories.includes(prod.category) ? "" : prod.category,
      price: prod.price,
      stock: prod.stock ?? 0,
      imageUrl: prod.imageUrl || "",
    });
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const finalCategory =
        form.category === "__CUSTOM__"
          ? form.customCategory.trim() || "General"
          : form.category;

      const prodId = editingItem ? editingItem.id : `prod_${Date.now()}`;
      const placeholderImg = `https://picsum.photos/seed/${encodeURIComponent(
        form.name.trim(),
      )}/300/300`;
      const finalImg = form.imageUrl.trim() || (editingItem?.imageUrl || placeholderImg);

      const data = {
        name: form.name.trim(),
        category: finalCategory,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        imageUrl: finalImg,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "merchants/demo_merchant/catalog", prodId), data, {
        merge: true,
      });

      setModalOpen(false);
      setToast(
        editingItem
          ? `"${form.name}" updated successfully!`
          : `"${form.name}" added to catalog!`,
      );
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error("Error saving product to Firestore:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "merchants/demo_merchant/catalog", deleteItem.id));
      const deletedName = deleteItem.name;
      setDeleteItem(null);
      setToast(`"${deletedName}" removed from catalog.`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error("Error deleting product from Firestore:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Manage your store's inventory and products</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Product Catalog</h2>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-blue/20 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Products</span>
            <Package className="h-4 w-4 text-brand-blue" />
          </div>
          <div className="mt-4 text-2xl font-bold font-mono text-brand-navy">{totalProducts}</div>
          <div className="mt-1 text-xs text-muted-foreground">Active in catalog</div>
        </div>

        <div className="rounded-2xl border border-brand-blue/20 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Categories</span>
            <LayoutDashboard className="h-4 w-4 text-brand-blue" />
          </div>
          <div className="mt-4 text-2xl font-bold font-mono text-brand-navy">{totalCategories}</div>
          <div className="mt-1 text-xs text-muted-foreground truncate" title={categories.join(", ")}>
            Across {categories.length} category types
          </div>
        </div>

        <div className="rounded-2xl border border-brand-blue/20 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Price Range</span>
            <ShieldCheck className="h-4 w-4 text-brand-blue" />
          </div>
          <div className="mt-4 text-2xl font-bold font-mono text-brand-navy">{priceRange}</div>
          <div className="mt-1 text-xs text-muted-foreground">Min to max item price</div>
        </div>

        <div className="rounded-2xl border border-brand-blue/20 bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Stock</span>
            <Activity className="h-4 w-4 text-brand-blue" />
          </div>
          <div className="mt-4 text-2xl font-bold font-mono text-brand-navy">{totalStock.toLocaleString("en-IN")} units</div>
          <div className="mt-1 text-xs text-muted-foreground">Available inventory</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-brand-blue/20 bg-card p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by product name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedCat("All")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap",
              selectedCat === "All"
                ? "bg-brand-blue text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap",
                  selectedCat === cat
                    ? "bg-brand-blue text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Toast */}
      {toast && (
        <div className="flex items-center gap-2 rounded-xl bg-success/15 border border-success/30 px-4 py-3 text-xs font-semibold text-success animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Catalog Grid */}
      {loading ? (
        <div className="rounded-2xl border border-brand-blue/20 bg-card p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-brand-blue" />
          Loading merchant catalog from Firestore...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-brand-navy">No products found</p>
          <p className="text-xs text-muted-foreground">
            {search || selectedCat !== "All"
              ? "Try adjusting your search terms or filter."
              : "Your catalog is empty. Add your first product to get started."}
          </p>
          {(search || selectedCat !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCat("All");
              }}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl border border-brand-blue/20 bg-card overflow-hidden transition-all duration-200 hover:border-brand-blue/50 hover:shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Image Container */}
                <div className="relative h-44 w-full bg-muted/60 overflow-hidden">
                  <img
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/300/300`}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
                    {product.category}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-md bg-card/90 backdrop-blur-md px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-navy shadow-sm">
                    Stock: {product.stock ?? 0}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-brand-navy text-sm line-clamp-1" title={product.name}>
                    {product.name}
                  </h3>
                  <div className="mt-1 font-mono text-lg font-bold text-brand-blue">
                    ₹{product.price.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-background/50">
                <button
                  onClick={() => openEditModal(product)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteItem(product)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive/80 hover:text-destructive hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <h3 className="font-semibold text-brand-navy text-base">
                {editingItem ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Product Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Mechanical Keyboard"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 font-normal text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>

              {/* Category Dropdown */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Add new category</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Price (₹) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 1499"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>
              </div>

              {/* Custom Category Input if selected */}
              {form.category === "__CUSTOM__" && (
                <div className="animate-in fade-in slide-in-from-top-1">
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    New Category Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gaming & Accessories"
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>
              )}

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>

              {/* Image URL & Preview */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Image URL <span className="text-xs font-normal text-muted-foreground">(optional — auto-generates if empty)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://... (leave empty for default placeholder)"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                />
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                  <img
                    src={
                      form.imageUrl.trim() ||
                      `https://picsum.photos/seed/${encodeURIComponent(form.name.trim() || "product")}/300/300`
                    }
                    alt="Preview"
                    className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground truncate">
                    Preview:{" "}
                    {form.imageUrl.trim()
                      ? "Custom URL provided"
                      : "Automatic placeholder based on product name"}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : editingItem ? "Update product" : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-brand-navy text-base">Delete product?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove <strong className="text-brand-navy font-semibold">{deleteItem.name}</strong> from your catalog? This will remove it from AI Buyer matching and in-policy recovery offers.
                </p>

                <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                  <img
                    src={deleteItem.imageUrl || `https://picsum.photos/seed/${deleteItem.id}/300/300`}
                    alt={deleteItem.name}
                    className="h-9 w-9 rounded-md object-cover border border-border shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-brand-navy truncate">{deleteItem.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      ₹{deleteItem.price.toLocaleString("en-IN")} • {deleteItem.category}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteItem(null)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "Deleting..." : "Delete product"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSessionTime(isoString?: string) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatOrderTime(isoString?: string) {
  if (!isoString) return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

const PROMPT_SUGGESTIONS = [
  {
    icon: "🎧",
    label: "Earbuds < ₹2,000",
    query: "Buy wireless earbuds under 2000",
    description: "In-policy auto-purchase via Razorpay Orders API",
    badge: "Auto Approved",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    icon: "👟",
    label: "Nike Shoes ₹8,000",
    query: "Buy running shoes for 8000",
    description: "Exceeds item limit, tests in-policy recovery offer",
    badge: "Recovery Offer",
    badgeClass: "text-brand-blue bg-brand-blue/10 border-brand-blue/20",
  },
  {
    icon: "📱",
    label: "Apple iPad ₹55,000",
    query: "Buy Apple iPad Air for 55000",
    description: "High-value spend, tests human approval queue",
    badge: "Escalation",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  {
    icon: "⌚",
    label: "Smartwatch < ₹3,500",
    query: "Buy smartwatch under 3500",
    description: "Evaluates velocity limits and merchant budget",
    badge: "In Catalog",
    badgeClass: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
  },
];

function BuyerChat() {
  const { sendChatRequest, submitRequest } = useFirewall();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem("sentrypay-chat-session");
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time chat sessions from Firestore / backend
  useEffect(() => {
    const unsub = subscribeSessions("demo_merchant", (newSessions) => {
      setSessions(newSessions);
    });
    return () => unsub();
  }, []);

  // Ensure an active session is loaded on mount (or create initial one if none exist)
  useEffect(() => {
    if (sessions.length > 0) {
      if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
        const firstId = sessions[0].id;
        setActiveSessionId(firstId);
        sessionStorage.setItem("sentrypay-chat-session", firstId);
      }
    } else if (sessions.length === 0 && activeSessionId === null) {
      // First time initialization: create initial session
      const newSession = createNewSessionObject();
      setActiveSessionId(newSession.id);
      sessionStorage.setItem("sentrypay-chat-session", newSession.id);
      persistSession("demo_merchant", newSession).then(() => {
        setSessions([newSession]);
      });
    }
  }, [sessions, activeSessionId]);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || (sessions.length > 0 ? sessions[0] : null);
  }, [sessions, activeSessionId]);

  const messages = activeSession?.messages || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Real-time Firestore listener for escalated transactions in the active session
  useEffect(() => {
    if (!activeSession) return;
    const escalatedMessages = activeSession.messages.filter(
      (m) => m.result?.decision === "escalated" && (m.transactionId || m.result?.transactionId)
    );
    if (escalatedMessages.length === 0) return;

    const unsubs = escalatedMessages.map((m) => {
      const txnId = m.transactionId || m.result!.transactionId!;
      return onSnapshot(doc(db, "merchants/demo_merchant/transactions", txnId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === "completed" || data.status === "denied" || (data.decision && data.decision !== "escalated")) {
            const updatedMessages: ChatMessage[] = activeSession.messages.map((msg) => {
              const currentTxnId = msg.transactionId || msg.result?.transactionId;
              if (currentTxnId === txnId) {
                return {
                  ...msg,
                  result: {
                    ...msg.result!,
                    decision: data.decision as Decision,
                    reason: data.reason || (data.status === "completed" ? "Approved by merchant" : "Denied by merchant"),
                    status: data.status,
                    orderId: data.orderId || data.razorpayOrderId,
                  },
                };
              }
              return msg;
            });

            const updatedSession: ChatSession = {
              ...activeSession,
              messages: updatedMessages,
              updatedAt: new Date().toISOString(),
            };

            setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? updatedSession : s)));
            persistSession("demo_merchant", updatedSession);
          }
        }
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [activeSession]);

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    sessionStorage.setItem("sentrypay-chat-session", id);
  }

  async function handleNewChat() {
    const newSession = createNewSessionObject();
    setActiveSessionId(newSession.id);
    sessionStorage.setItem("sentrypay-chat-session", newSession.id);
    setSessions((prev) => [newSession, ...prev]);
    await persistSession("demo_merchant", newSession);
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await removeSession("demo_merchant", id);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setActiveSessionId(nextId);
        if (nextId) sessionStorage.setItem("sentrypay-chat-session", nextId);
        else sessionStorage.removeItem("sentrypay-chat-session");
      }
      return remaining;
    });
  }

  // Auto-resize input textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(Math.max(inputRef.current.scrollHeight, 44), 130)}px`;
    }
  }, [text]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  }

  async function sendPrompt(customText?: string) {
    const request = (typeof customText === "string" ? customText : text).trim();
    if (!request || loading) return;

    // Ensure we have a session
    let targetSession = activeSession;
    if (!targetSession) {
      targetSession = createNewSessionObject();
      setActiveSessionId(targetSession.id);
      sessionStorage.setItem("sentrypay-chat-session", targetSession.id);
    }

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: request,
      timestamp: now,
    };

    const isFirstUserMsg = !targetSession.messages.some((m) => m.role === "user");
    const updatedTitle = isFirstUserMsg ? request.slice(0, 36) : targetSession.title;

    const sessionWithUser: ChatSession = {
      ...targetSession,
      title: updatedTitle,
      updatedAt: now,
      messages: [...targetSession.messages, userMsg],
    };

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === sessionWithUser.id);
      return exists ? prev.map((s) => (s.id === sessionWithUser.id ? sessionWithUser : s)) : [sessionWithUser, ...prev];
    });
    setText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const result = await sendChatRequest(request);
      const agentNow = new Date().toISOString();
      let agentMsg: ChatMessage;

      if (result.decision === "conversational") {
        agentMsg = {
          id: `msg_${Date.now()}_agent`,
          role: "agent",
          content: result.conversationalReply || result.reason || "How can I help you?",
          timestamp: agentNow,
        };
      } else if (result.decision === "not_found") {
        agentMsg = {
          id: `msg_${Date.now()}_agent`,
          role: "agent",
          content: result.reason || "I couldn't find a matching product in the catalog.",
          timestamp: agentNow,
          result,
        };
      } else {
        agentMsg = {
          id: `msg_${Date.now()}_agent`,
          role: "agent",
          content: `I evaluated "${request}" through the firewall policy engine.`,
          timestamp: agentNow,
          transactionId: result.transactionId,
          result,
        };
      }

      const completedSession: ChatSession = {
        ...sessionWithUser,
        updatedAt: agentNow,
        messages: [...sessionWithUser.messages, agentMsg],
      };

      setSessions((prev) => prev.map((s) => (s.id === completedSession.id ? completedSession : s)));
      await persistSession("demo_merchant", completedSession);
    } finally {
      setLoading(false);
    }
  }

  async function acceptAlternative(result: SubmitResult) {
    if (!result.alternative || !activeSession) return;
    setLoading(true);
    try {
      const next = await submitRequest(result.alternative);
      const now = new Date().toISOString();
      const userAcceptMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: `Accept ${result.alternative.name} for ₹${result.alternative.price.toLocaleString("en-IN")}`,
        timestamp: now,
      };
      const agentOutcomeMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}_agent`,
        role: "agent",
        content: `Alternative request sent through the firewall.`,
        timestamp: new Date().toISOString(),
        transactionId: next.transactionId,
        result: next,
      };

      const updatedSession: ChatSession = {
        ...activeSession,
        updatedAt: new Date().toISOString(),
        messages: [...activeSession.messages, userAcceptMsg, agentOutcomeMsg],
      };

      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      await persistSession("demo_merchant", updatedSession);
    } finally {
      setLoading(false);
    }
  }

  function declineAlternative() {
    if (!activeSession) return;
    const now = new Date().toISOString();
    const userDeclineMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: `Decline alternative offer`,
      timestamp: now,
    };
    const agentReplyMsg: ChatMessage = {
      id: `msg_${Date.now() + 1}_agent`,
      role: "agent",
      content: `Offer declined. Let me know if you would like to search for a different item.`,
      timestamp: new Date().toISOString(),
    };

    const updatedSession: ChatSession = {
      ...activeSession,
      updatedAt: new Date().toISOString(),
      messages: [...activeSession.messages, userDeclineMsg, agentReplyMsg],
    };

    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    persistSession("demo_merchant", updatedSession);
  }

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div className="mx-auto max-w-6xl h-full w-full flex flex-col min-h-0 space-y-2.5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-brand-blue">
              Autonomous Purchasing Simulation
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-brand-navy">AI Buyer</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs text-muted-foreground shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
            <span>SentryPay Firewall Protected</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        {/* Chat Sessions Left Sidebar */}
        <div
          className={cn(
            "flex flex-col border-r border-border bg-muted/20 transition-all duration-300 ease-in-out shrink-0 h-full",
            sidebarOpen ? "w-72 sm:w-80" : "w-0 overflow-hidden border-none"
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-3.5 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-navy">
              <MessageSquare className="h-4 w-4 text-brand-blue" />
              <span>Chat History</span>
              <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 font-mono text-[10px] text-brand-blue">
                {sessions.length}
              </span>
            </div>
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue/10 px-2.5 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-brand-blue hover:text-white cursor-pointer"
              title="Start a new chat session"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New chat</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No past sessions yet. Start a new chat!
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const lastMsg = s.messages[s.messages.length - 1];
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={cn(
                      "group relative flex cursor-pointer flex-col rounded-xl p-3 text-left transition",
                      isActive
                        ? "bg-brand-blue/10 border border-brand-blue/40 shadow-xs"
                        : "hover:bg-muted/60 border border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={cn("truncate text-xs font-semibold", isActive ? "text-brand-navy" : "text-foreground")}>
                        {s.title || "New chat"}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatSessionTime(s.updatedAt || s.createdAt)}
                      </span>
                    </div>
                    {lastMsg && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {lastMsg.content}
                      </p>
                    )}
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      title="Delete session"
                      className="absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition rounded-md hover:bg-background/80 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Conversation Area */}
        <div className="flex flex-1 min-h-0 flex-col bg-card h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 sm:px-5 py-2.5 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen((open) => !open)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-brand-navy transition cursor-pointer"
                title={sidebarOpen ? "Hide chat sessions" : "Show chat sessions"}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </button>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue shadow-2xs">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-brand-navy">
                  {activeSession?.title || "SentryPay Shopping Agent"}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span>Groq Llama 3.3 • Live Catalog & Firewall Rules</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleNewChat}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-brand-navy hover:bg-muted transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New chat</span>
              </button>
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                {AGENT_ID}
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 bg-background/50 p-4 sm:p-5">
            {/* Show rich starter hero if session is fresh / no user messages yet */}
            {!hasUserMessages && (
              <div className="my-auto py-6 px-2 text-center max-w-2xl mx-auto space-y-5">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-brand-blue via-blue-500 to-indigo-500 opacity-20 blur-md animate-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-blue to-blue-600 text-white shadow-md shadow-brand-blue/25">
                    <Bot className="h-7 w-7" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Autonomous Shopping Assistant</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-navy">
                    What would you like to purchase today?
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                    Type any purchase request in natural language. The agent extracts intent, searches the merchant catalog, and evaluates transaction limits before calling the Razorpay Orders API.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
                  {PROMPT_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setText(item.query);
                        inputRef.current?.focus();
                      }}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue/60 hover:bg-brand-blue/[0.02] hover:shadow-md hover:shadow-brand-blue/5 text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase", item.badgeClass)}>
                          {item.badge}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-brand-navy group-hover:text-brand-blue transition">
                          "{item.query}"
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Thread */}
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
                  {/* Agent message layout */}
                  {!isUser && (
                    <div className="flex items-start gap-3 w-full max-w-[92%] sm:max-w-[85%]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue/15 to-blue-500/10 border border-brand-blue/25 text-brand-blue shadow-2xs mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-semibold text-brand-navy">AI Buyer</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-1.5 py-0.2 text-[9px] font-semibold text-brand-blue">
                            Groq Llama 3
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground/60 ml-auto">
                            {formatOrderTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="rounded-2xl rounded-tl-xs border border-border/80 bg-card p-4 text-sm leading-relaxed text-brand-navy shadow-2xs">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          {message.result && (
                            <DecisionCard
                              result={message.result}
                              onAccept={() => acceptAlternative(message.result!)}
                              onDecline={declineAlternative}
                              onSelectSuggestion={(query) => {
                                setText(query);
                                inputRef.current?.focus();
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User message layout */}
                  {isUser && (
                    <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
                      <div className="flex flex-col items-end">
                        <div className="rounded-2xl rounded-tr-xs bg-gradient-to-r from-brand-blue via-blue-600 to-indigo-600 px-4 py-3 text-sm text-white shadow-md shadow-brand-blue/20 leading-relaxed">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <span className="mt-1 px-1 font-mono text-[10px] text-muted-foreground/70">
                          {formatOrderTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white text-[11px] font-semibold mt-0.5 shadow-2xs">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Evaluating State */}
            {loading && (
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue shadow-2xs animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-xs border border-brand-blue/25 bg-card p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-brand-navy">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-blue" />
                    <span>Evaluating purchase request with Groq LLM...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Checking catalog, velocity rules & price limit thresholds
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/40 bg-muted/15 px-4 py-1.5 scrollbar-none shrink-0">
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mr-1">
              <Sparkles className="h-3 w-3 text-brand-blue" /> Quick test:
            </span>
            {PROMPT_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  setText(item.query);
                  inputRef.current?.focus();
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs text-brand-navy font-medium shadow-2xs transition hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50 cursor-pointer"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Redesigned Studio Chatbox Input */}
          <div className="border-t border-border/60 bg-card/80 p-3 sm:p-3.5 backdrop-blur-md shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt();
              }}
              className="relative"
            >
              <div className="relative rounded-2xl border border-border/80 bg-background/90 shadow-sm transition-all duration-200 focus-within:border-brand-blue/60 focus-within:ring-4 focus-within:ring-brand-blue/10 focus-within:shadow-md">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask AI Buyer to purchase anything (e.g. 'Buy wireless earbuds under 2000')..."
                  className="min-h-[44px] max-h-[140px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
                />

                <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-blue">
                      <Zap className="h-3 w-3" />
                      <span>Autonomous Mode</span>
                    </div>
                    {text.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setText("");
                          inputRef.current?.focus();
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                      <span>Press</span>
                      <kbd className="rounded border border-border bg-muted/70 px-1.5 py-0.5 text-[9px] font-mono shadow-2xs">Enter ↵</kbd>
                    </div>
                    <button
                      type="submit"
                      disabled={!text.trim() || loading}
                      className={cn(
                        "flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all duration-150 shadow-xs",
                        text.trim() && !loading
                          ? "bg-gradient-to-r from-brand-blue to-blue-600 text-white hover:brightness-110 hover:shadow-md hover:shadow-brand-blue/25 active:scale-95 cursor-pointer"
                          : "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-60"
                      )}
                    >
                      <span>Send request</span>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground/70">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
                  <span>Razorpay Orders API • Real-time firewall policy verification</span>
                </div>
                <span className="hidden sm:inline font-mono text-[10px]">Groq Llama 3.3 70B</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ 
  result, 
  onAccept, 
  onDecline,
  onSelectSuggestion
}: { 
  result: SubmitResult; 
  onAccept: () => void; 
  onDecline: () => void; 
  onSelectSuggestion?: (query: string) => void;
}) { 
  if (result.decision === "conversational") {
    return null;
  }

  // Outcome: Not Found (Neutral styling, NOT policy blocked)
  if (result.decision === "not_found") {
    return (
      <div className="mt-3 rounded-xl border border-border bg-card p-3.5 shadow-sm text-foreground">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span>Product Not Found</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider rounded bg-muted px-2 py-0.5 text-muted-foreground">
            NOT IN CATALOG
          </span>
        </div>
        
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {result.reason || "I couldn't find a matching product — try one of our catalog items below:"}
        </p>

        {result.suggestions && result.suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] font-semibold text-brand-navy">Available in catalog:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.suggestions.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelectSuggestion && onSelectSuggestion(`Buy ${item.name}`)}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2 text-left transition hover:border-brand-blue/50 hover:bg-brand-blue/5 cursor-pointer group"
                >
                  <img 
                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/300`} 
                    alt={item.name}
                    className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-brand-navy truncate group-hover:text-brand-blue">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{item.category}</span>
                      <span className="font-mono font-semibold text-brand-navy">₹{item.price.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const config = ({ 
    approved: ["Approved", "text-success", "bg-success/10 border-success/30", CheckCircle2], 
    recovered: ["Recovery offer", "text-brand-blue", "bg-brand-blue/10 border-brand-blue/30", RefreshCw], 
    escalated: ["Pending approval", "text-warning", "bg-warning/10 border-warning/30", Clock3], 
    blocked: ["Blocked", "text-destructive", "bg-destructive/10 border-destructive/30", Ban] 
  } as const)[result.decision]; 
  
  const Icon = config[3]; 
  const orderId = result.orderId || result.entry?.orderId;

  return (
    <div className={cn("mt-3 rounded-xl border p-3.5 transition-all", config[2])}>
      <div className={cn("flex items-center gap-2 text-xs font-semibold", config[1])}>
        <Icon className="h-4 w-4" />
        {config[0]}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider">{result.decision}</span>
      </div>
      
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.reason}</p>

      {/* Outcome 1: Approved confirmation card */}
      {result.decision === "approved" && (
        <div className="mt-3 overflow-hidden rounded-xl border border-success/30 bg-card shadow-xs">
          {/* Top Bar: Autonomous Payment Status + Razorpay Badge */}
          <div className="flex items-center justify-between border-b border-border/60 bg-success/[0.04] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold tracking-tight text-brand-navy">
                Approved & Paid
              </span>
            </div>
            
            {/* Razorpay badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-[#0c2340] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs">
              <svg className="h-3 w-3 fill-[#0d94fb]" viewBox="0 0 24 24">
                <path d="M14.078 0L3 13.523h7.625L7.922 24 21 8.477h-7.625z" />
              </svg>
              <span className="tracking-wide">Razorpay</span>
              <span className="rounded bg-[#0d94fb]/20 px-1 text-[9px] font-mono text-[#0d94fb]">TEST</span>
            </div>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Order Summary */}
            {result.parsedProduct && (
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-2.5">
                <img 
                  src={result.parsedProduct.imageUrl || `https://picsum.photos/seed/${result.parsedProduct.id}/300/300`}
                  alt={result.parsedProduct.name}
                  className="h-12 w-12 rounded-lg object-cover border border-border/80 shrink-0 shadow-2xs"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-brand-navy truncate">
                      {result.parsedProduct.name}
                    </h4>
                    <span className="shrink-0 font-mono text-xs font-bold text-brand-blue">
                      ₹{(result.entry?.amount || result.parsedProduct.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {result.parsedProduct.category}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatOrderTime(result.time || result.entry?.time)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Price Note (if user stated budget differed from catalog price) */}
            {result.priceNote && (
              <div className="rounded-md bg-brand-blue/5 border border-brand-blue/15 px-2.5 py-1.5 text-[11px] text-brand-navy flex items-start gap-1.5">
                <span className="text-brand-blue font-bold shrink-0">ℹ</span>
                <span className="leading-tight text-muted-foreground">{result.priceNote}</span>
              </div>
            )}

            {/* Razorpay Order ID & Status */}
            {orderId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 font-mono text-xs text-brand-navy">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-bold text-brand-navy select-all">{orderId}</span>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="inline-flex items-center rounded-md bg-success/15 px-2 py-0.5 font-mono text-[10px] font-bold text-success">
                    PAID • 200 OK
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground font-mono">
                Status: {result.status || "completed"} {result.errorReason ? `(${result.errorReason})` : ""}
              </div>
            )}

            {/* Micro-footer note explaining autonomous payment */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-brand-blue" />
                Autonomous payment executed via Razorpay Orders API
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                NO HUMAN CHECKOUT
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Outcome 2: Recovery offer card with Accept and Decline */}
      {result.decision === "recovered" && result.alternative && (
        <div className="mt-3 rounded-lg border border-brand-blue/20 bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={result.alternative.imageUrl || `https://picsum.photos/seed/${result.alternative.id}/300/300`}
                alt={result.alternative.name}
                className="h-11 w-11 rounded-md object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-navy truncate">{result.alternative.name}</div>
                <div className="mt-0.5 font-mono text-xs font-bold text-brand-blue">
                  ₹{result.alternative.price.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue shrink-0">
              In-policy alternative
            </span>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2.5">
            <button 
              onClick={onDecline} 
              className="rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Decline
            </button>
            <button 
              onClick={onAccept} 
              className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Accept Alternative
            </button>
          </div>
        </div>
      )}

      {/* Outcome 3: Escalated pending-approval card with live status */}
      {result.decision === "escalated" && (
        <div className="mt-3 space-y-2">
          {result.parsedProduct && (
            <div className="flex items-center gap-2.5 rounded-md border border-warning/20 bg-background/50 p-2">
              <img 
                src={result.parsedProduct.imageUrl || `https://picsum.photos/seed/${result.parsedProduct.id}/300/300`}
                alt={result.parsedProduct.name}
                className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-brand-navy truncate">{result.parsedProduct.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  ₹{(result.entry?.amount || result.parsedProduct.price).toLocaleString("en-IN")} • {result.parsedProduct.category}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-card p-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-warning"></span>
              </span>
              <span className="text-xs font-medium text-brand-navy">Awaiting merchant review in Approval Queue</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">{result.transactionId?.slice(0, 8)}</span>
          </div>
        </div>
      )}

      {/* Outcome 4: Blocked plain rejection card */}
      {result.decision === "blocked" && (
        <div className="mt-2 rounded-lg bg-destructive/5 px-2.5 py-1.5 font-mono text-[10px] text-destructive">
          POLICY ENFORCED • TRANSACTION HARD BLOCKED
        </div>
      )}
    </div>
  ); 
}

function ApprovalsPanel() {
  const { resolveApproval, approvals } = useFirewall();

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Human-in-the-loop decisions</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Approval queue</h2>
      </div>
      {approvals.length === 0 ? (
        <div className="rounded-2xl border border-brand-blue/20 bg-card">
          <EmptyState icon={CheckCircle2} text="No requests are waiting for approval. Everything is under control." />
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {approvals.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
                className="flex flex-col gap-5 rounded-2xl border border-brand-blue/25 bg-card p-5 sm:flex-row sm:items-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-brand-navy">{item.product}</h3>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Approval required</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI Agent wants to spend <span className="font-mono font-semibold text-brand-navy">₹{item.amount?.toLocaleString("en-IN")}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                  <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                    ID: {item.id} · {new Date(item.time).toLocaleTimeString("en-IN")}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => resolveApproval(item.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    Deny
                  </button>
                  <button
                    onClick={() => resolveApproval(item.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3.5 py-2 text-xs font-semibold text-white hover:brightness-105 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AuditPanel() {
  const { auditLog } = useFirewall();
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    valid: boolean;
    count: number;
    errorMsg?: string;
  }>({ checked: false, valid: false, count: 0 });

  const verifyChain = async () => {
    setVerifying(true);
    setVerificationResult({ checked: false, valid: false, count: 0 });
    
    // Simulate verification delay for user feedback
    await new Promise((r) => setTimeout(r, 600));

    // Chain is ordered newest-first, reverse to verify chronologically from genesis
    const chain = [...auditLog].reverse();
    let currentPrev = GENESIS_HASH;
    let valid = true;
    let errorMsg: string | undefined = undefined;

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      
      // 1. Verify prevHash links to previous block
      if (entry.prevHash && entry.prevHash !== currentPrev) {
        valid = false;
        errorMsg = `Chain linkage broken at block #${i + 1} (${entry.product || entry.id}). Expected prevHash: ${currentPrev.slice(0, 10)}... Found: ${entry.prevHash.slice(0, 10)}...`;
        break;
      }

      // 2. Recompute SHA-256 hash using canonical format
      const computed = await computeTxnHash(entry.prevHash || GENESIS_HASH, {
        time: entry.time,
        agent: entry.agent,
        product: entry.product,
        amount: entry.amount,
        decision: entry.decision,
        reason: entry.reason,
      });

      if (entry.hash && computed !== entry.hash) {
        valid = false;
        errorMsg = `Hash mismatch at block #${i + 1} (${entry.product || entry.id}). Cryptographic integrity corrupted!`;
        break;
      }

      currentPrev = entry.hash || computed;
    }

    setVerifying(false);
    setVerificationResult({
      checked: true,
      valid,
      count: chain.length,
      errorMsg,
    });
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Immutable event history</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Audit trail</h2>
      </div>
      <div className="rounded-2xl border border-brand-blue/20 bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h3 className="font-semibold text-brand-navy">Hash-chained decisions</h3>
            <p className="mt-1 text-xs text-muted-foreground">Every event is cryptographically linked to the previous SHA-256 block</p>
          </div>
          {verificationResult.checked ? (
            verificationResult.valid ? (
              <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
                <ShieldCheck className="h-4 w-4" />
                Chain verified ({verificationResult.count} blocks intact)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive">
                <Ban className="h-4 w-4" />
                {verificationResult.errorMsg}
              </span>
            )
          ) : (
            <button
              onClick={verifyChain}
              disabled={verifying || auditLog.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/20 disabled:opacity-50 transition"
            >
              {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {verifying ? "Verifying SHA-256 Chain..." : "Verify chain"}
            </button>
          )}
        </div>
        {auditLog.length ? (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {auditLog.map((entry) => (
                <AuditRow key={entry.id} entry={entry} detailed />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState icon={Activity} text="Your audit trail will appear here as agents make purchase requests." />
        )}
      </div>
    </div>
  );
}

function AuditRow({ entry, detailed = false }: { entry: any; detailed?: boolean }) {
  const config = {
    approved: ["Approved", "text-success", "bg-success/10", CheckCircle2, "border-success"],
    blocked: ["Blocked", "text-destructive", "bg-destructive/10", Ban, "border-destructive"],
    escalated: ["Escalated", "text-warning", "bg-warning/10", Clock3, "border-warning"],
    recovered: ["Recovered", "text-brand-blue", "bg-brand-blue/10", RefreshCw, "border-brand-blue"],
  };
  const itemConfig = (config as Record<string, any>)[entry.decision] || ["Unknown", "text-muted-foreground", "bg-muted", Activity, "border-muted"];
  
  const Icon = itemConfig[3];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3 px-6 py-4 border-l-4", itemConfig[4])}
    >
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", itemConfig[2])}>
        <Icon className={cn("h-4 w-4", itemConfig[1])} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-brand-navy">{entry.product}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", itemConfig[2], itemConfig[1])}>
            {itemConfig[0]}
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {new Date(entry.time).toLocaleTimeString("en-IN")}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="font-mono font-medium text-brand-navy">₹{entry.amount?.toLocaleString("en-IN")}</span>
          <span>{entry.reason}</span>
        </div>
        {detailed && (
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span className="rounded bg-muted px-2 py-1">hash: {entry.hash ? `${entry.hash.slice(0, 16)}...` : "pending"}</span>
            <span className="rounded bg-muted px-2 py-1">prev: {entry.prevHash ? `${entry.prevHash.slice(0, 16)}...` : "none"}</span>
            <span className="rounded bg-muted px-2 py-1">agent: {entry.agent}</span>
            {entry.orderId && <span className="rounded bg-success/10 text-success px-2 py-1">order: {entry.orderId}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, text, action, actionLabel }: { icon: typeof Activity; text: string; action?: () => void; actionLabel?: string }) { 
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <button onClick={action} className="mt-4 text-xs font-semibold text-brand-blue hover:underline">{actionLabel}</button>}
    </div>
  ); 
}
