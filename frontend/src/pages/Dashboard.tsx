import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Ban,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/catalog";
import { AGENT_ID, useFirewall, SubmitResult } from "@/lib/store";
import { Decision, Rules } from "@/lib/types";
import { GENESIS_HASH, computeTxnHash } from "@/lib/hash";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "chat", label: "AI Buyer", icon: Bot },
  { id: "rules", label: "Firewall Rules", icon: Settings2 },
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
    <div className="flex min-h-screen bg-background text-foreground">
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
      <div className={cn("min-w-0 flex-1 transition-[padding] duration-300 ease-out", sidebarOpen ? "pl-72" : "pl-0")}>
        <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex items-center gap-1"><button onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-brand-navy" title={sidebarOpen ? "Close sidebar" : "Open sidebar"}><Menu className="h-4 w-4" /></button></div><div><div className="text-xs text-muted-foreground">Merchant workspace /</div><h1 className="text-lg font-semibold capitalize">{tab === "chat" ? "AI Buyer" : tab === "rules" ? "Firewall Rules" : tab === "audit" ? "Audit Trail" : tab === "approvals" ? "Approval Queue" : "Overview"}</h1></div></div>
          <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />System operational</div><div className="h-8 w-8 rounded-full bg-brand-blue/10 text-center text-xs leading-8 font-semibold text-brand-navy">{merchantEmail?.[0]?.toUpperCase() ?? "M"}</div></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8">{tab === "overview" && <Overview onTab={setTab} />}{tab === "chat" && <BuyerChat />}{tab === "rules" && <RulesPanel />}{tab === "approvals" && <ApprovalsPanel />}{tab === "audit" && <AuditPanel />}</main>
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
  const { rules, setRules } = useFirewall();
  const [draft, setDraft] = useState<Rules>(rules);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  function update<K extends keyof Rules>(key: K, value: Rules[K]) { 
    setDraft((d) => ({ ...d, [key]: value })); 
    setSaved(false); 
  }
  
  async function save(event: FormEvent) { 
    event.preventDefault(); 
    setSaving(true);
    try {
      const rulesRef = doc(db, "merchants/demo_merchant/rules/current");
      await setDoc(rulesRef, {
        maxOrderAmount: draft.maxOrder,
        dailySpendLimit: draft.dailyLimit,
        allowedCategories: draft.categories,
        approvalThreshold: draft.approvalAbove,
        maxDiscountPercent: draft.maxDiscount,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setRules(draft); 
      setSaved(true); 
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      console.error("Error saving rules to Firestore:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm text-muted-foreground">Control what your agents can spend</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Firewall rules</h2>
      </div>
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
            <Save className="h-4 w-4" />
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

function BuyerChat() {
  const { sendChatRequest, submitRequest } = useFirewall();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ from: "user" | "agent"; text: string; result?: SubmitResult }[]>([
    { from: "agent", text: "Hi! I’m your autonomous AI buyer powered by Groq and the SentryPay firewall. Tell me what product you’d like to purchase and I’ll extract your intent and submit it through policy verification." }
  ]);
  
  // Real-time Firestore listener for escalated transactions
  useEffect(() => {
    const escalatedMessages = messages.filter(m => m.result?.decision === 'escalated' && m.result?.transactionId);
    if (escalatedMessages.length === 0) return;

    const unsubs = escalatedMessages.map(m => {
      return onSnapshot(doc(db, "merchants/demo_merchant/transactions", m.result!.transactionId!), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'completed' || data.status === 'denied' || (data.decision && data.decision !== 'escalated')) {
            setMessages(prev => prev.map(msg => 
              msg.result?.transactionId === m.result?.transactionId
                ? {
                    ...msg,
                    result: {
                      ...msg.result!,
                      decision: data.decision as Decision,
                      reason: data.reason || (data.status === 'completed' ? 'Approved by merchant' : 'Denied by merchant'),
                      status: data.status,
                      orderId: data.orderId || data.razorpayOrderId,
                    }
                  }
                : msg
            ));
          }
        }
      });
    });

    return () => unsubs.forEach(u => u());
  }, [messages]);

  async function send(event: FormEvent) { 
    event.preventDefault(); 
    if (!text.trim() || loading) return; 
    const request = text.trim(); 
    
    setMessages((m) => [...m, { from: "user", text: request }]); 
    setText(""); 
    setLoading(true);
    
    try {
      const result = await sendChatRequest(request); 
      setMessages((m) => [...m, { from: "agent", text: `I evaluated "${request}" through the firewall policy engine.`, result }]); 
    } finally {
      setLoading(false);
    }
  }
  
  async function acceptAlternative(result: SubmitResult) { 
    if (!result.alternative) return; 
    setLoading(true);
    try {
      const next = await submitRequest(result.alternative); 
      setMessages((m) => [
        ...m, 
        { from: "user", text: `Accept ${result.alternative!.name} for ₹${result.alternative!.price.toLocaleString("en-IN")}` }, 
        { from: "agent", text: `Alternative request sent through the firewall.`, result: next }
      ]); 
    } finally {
      setLoading(false);
    }
  }

  function declineAlternative(result: SubmitResult) {
    setMessages((m) => [
      ...m,
      { from: "user", text: `Decline alternative offer` },
      { from: "agent", text: `Offer declined. Let me know if you would like to search for a different item.` }
    ]);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7">
        <p className="text-sm text-muted-foreground">Simulate an autonomous purchase with natural language</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">AI Buyer</h2>
      </div>
      <div className="overflow-hidden rounded-2xl border border-brand-blue/20 bg-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Bot className="h-5 w-5" /></div>
          <div>
            <div className="text-sm font-semibold text-brand-navy">SentryPay shopping agent</div>
            <div className="flex items-center gap-1 text-[11px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Connected to Groq LLM & merchant catalog</div>
          </div>
          <span className="ml-auto rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">{AGENT_ID}</span>
        </div>
        
        <div className="min-h-[420px] max-h-[600px] overflow-y-auto space-y-5 bg-background/50 p-5 sm:p-7">
          {messages.map((message, i) => (
            <div key={i} className={cn("flex gap-3", message.from === "user" && "justify-end")}>
              <div className={cn("max-w-[90%] rounded-2xl px-4 py-3 text-sm", message.from === "user" ? "rounded-br-md bg-brand-blue text-white" : "rounded-bl-md border border-border bg-card text-brand-navy")}>
                <p>{message.text}</p>
                {message.result && (
                  <DecisionCard 
                    result={message.result} 
                    onAccept={() => acceptAlternative(message.result!)} 
                    onDecline={() => declineAlternative(message.result!)}
                  />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
              <RefreshCw className="h-3 w-3 animate-spin text-brand-blue" />
              AI Agent is parsing catalog and evaluating firewall rules...
            </div>
          )}
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-border bg-card p-4">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Try: 'Buy wireless earbuds under 2000' or 'Buy running shoes for 8000'" 
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand-blue" 
          />
          <button type="submit" disabled={loading} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            <span className="hidden sm:inline">Send request</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function DecisionCard({ 
  result, 
  onAccept, 
  onDecline 
}: { 
  result: SubmitResult; 
  onAccept: () => void; 
  onDecline: () => void; 
}) { 
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
        <div className="mt-3 rounded-lg border border-success/20 bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-brand-navy">Order Placed & Confirmed</div>
            <span className="rounded bg-success/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-success">
              {result.status === "completed" ? "PAID" : result.status?.toUpperCase() || "CONFIRMED"}
            </span>
          </div>
          {orderId ? (
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-brand-navy">
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
              <span>Razorpay Order ID: <strong className="text-brand-blue">{orderId}</strong></span>
            </div>
          ) : (
            <div className="mt-1.5 text-[10px] text-muted-foreground font-mono">
              Status: {result.status} {result.errorReason ? `(${result.errorReason})` : ""}
            </div>
          )}
        </div>
      )}

      {/* Outcome 2: Recovery offer card with Accept and Decline */}
      {result.decision === "recovered" && result.alternative && (
        <div className="mt-3 rounded-lg border border-brand-blue/20 bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-brand-navy">{result.alternative.name}</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-brand-blue">
                ₹{result.alternative.price.toLocaleString("en-IN")}
              </div>
            </div>
            <span className="rounded bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue">
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
        <div className="mt-3 flex items-center justify-between rounded-lg border border-warning/20 bg-card p-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning"></span>
            </span>
            <span className="text-xs font-medium text-brand-navy">Awaiting merchant review in Approval Queue</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{result.transactionId?.slice(0, 8)}</span>
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
  const config = ({
    approved: ["Approved", "text-success", "bg-success/10", CheckCircle2, "border-success"],
    blocked: ["Blocked", "text-destructive", "bg-destructive/10", Ban, "border-destructive"],
    escalated: ["Escalated", "text-warning", "bg-warning/10", Clock3, "border-warning"],
    recovered: ["Recovered", "text-brand-blue", "bg-brand-blue/10", RefreshCw, "border-brand-blue"],
  } as const)[entry.decision as Decision] || ["Unknown", "text-muted-foreground", "bg-muted", Activity, "border-muted"];
  
  const Icon = config[3];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3 px-6 py-4 border-l-4", config[4])}
    >
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config[2])}>
        <Icon className={cn("h-4 w-4", config[1])} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-brand-navy">{entry.product}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", config[2], config[1])}>
            {config[0]}
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
