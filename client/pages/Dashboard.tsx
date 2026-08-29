import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Activity,
  ArrowDownRight,
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
  PanelLeft,
  MessageSquareText,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATALOG, parseIntent } from "@/lib/catalog";
import { AGENT_ID, useFirewall } from "@/lib/store";
import { Decision, Product, Rules } from "@/lib/types";

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
  const approved = auditLog.filter((e) => e.decision === "approved").length;
  const blocked = auditLog.filter((e) => e.decision === "blocked").length;
  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-muted-foreground">Good morning, merchant</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Your firewall at a glance</h2></div><div className="font-mono text-xs text-muted-foreground">LIVE · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Requests today" value={String(auditLog.length + approvals.length).padStart(2, "0")} trend="Live stream" icon={Activity} color="blue" /><Stat label="Approved volume" value={`₹${dailySpent.toLocaleString("en-IN")}`} trend={approved ? `${approved} approved` : "Awaiting first request"} icon={CheckCircle2} color="green" /><Stat label="Approval queue" value={String(approvals.length).padStart(2, "0")} trend={approvals.length ? "Needs attention" : "All clear"} icon={Clock3} color="amber" /><Stat label="Blocked requests" value={String(blocked).padStart(2, "0")} trend="Protected by rules" icon={Ban} color="red" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-brand-blue/20 bg-card p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-brand-navy">Firewall activity</h3><p className="mt-1 text-xs text-muted-foreground">Every request passes through your policy engine</p></div><button onClick={() => onTab("chat")} className="text-xs font-semibold text-brand-blue hover:underline">Try a request <ChevronRight className="inline h-3 w-3" /></button></div><MiniFlow /></section><section className="rounded-2xl border border-brand-blue/20 bg-card p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-brand-navy">Active policy</h3><p className="mt-1 text-xs text-muted-foreground">Last saved just now</p></div><button onClick={() => onTab("rules")} className="text-xs font-semibold text-brand-blue hover:underline">Edit</button></div><div className="mt-6 space-y-4"><RuleLine label="Max order amount" value={`₹${rules.maxOrder.toLocaleString("en-IN")}`} /><RuleLine label="Daily spend limit" value={`₹${rules.dailyLimit.toLocaleString("en-IN")}`} /><RuleLine label="Approval threshold" value={`₹${rules.approvalAbove.toLocaleString("en-IN")}`} /><RuleLine label="Allowed categories" value={rules.categories.join(", ") || "None"} /></div></section></div>
    <section className="rounded-2xl border border-brand-blue/20 bg-card"><div className="flex items-center justify-between border-b border-border px-6 py-4"><div><h3 className="font-semibold text-brand-navy">Recent decisions</h3><p className="mt-1 text-xs text-muted-foreground">Live audit stream</p></div><button onClick={() => onTab("audit")} className="text-xs font-semibold text-brand-blue">View all <ChevronRight className="inline h-3 w-3" /></button></div>{auditLog.length ? <div className="divide-y divide-border">{auditLog.slice(0, 4).map((entry) => <AuditRow key={entry.id} entry={entry} />)}</div> : <EmptyState icon={Activity} text="No requests yet. Open AI Buyer to simulate your first purchase." action={() => onTab("chat")} actionLabel="Open AI Buyer" />}</section>
  </div>;
}

function Stat({ label, value, trend, icon: Icon, color }: { label: string; value: string; trend: string; icon: typeof Activity; color: string }) { return <div className="rounded-2xl border border-brand-blue/20 bg-card p-5"><div className="flex items-start justify-between"><div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color === "blue" ? "bg-brand-blue/10 text-brand-blue" : color === "green" ? "bg-success/10 text-success" : color === "amber" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}><Icon className="h-4 w-4" /></div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span></div><div className="mt-5 text-2xl font-bold font-mono tracking-tight text-brand-navy">{value}</div><div className="mt-1 text-xs text-muted-foreground">{trend}</div></div> }
function RuleLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono text-xs font-medium text-brand-navy">{value}</span></div> }
function MiniFlow() { return <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3"><FlowPill icon={Bot} label="AI Agent" /><ChevronRight className="h-4 w-4 text-muted-foreground" /><FlowPill icon={ShieldCheck} label="Firewall" active /><ChevronRight className="h-4 w-4 text-muted-foreground" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[[CheckCircle2,"Approved","text-success"],[RefreshCw,"Recovered","text-brand-blue"],[Clock3,"Escalated","text-warning"],[Ban,"Blocked","text-destructive"]].map(([Icon,label,color]) => <div key={String(label)} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-2"><Icon className={cn("h-3.5 w-3.5", String(color))} /><span className="text-[10px] font-medium">{String(label)}</span></div>)}</div></div> }
function FlowPill({ icon: Icon, label, active }: { icon: typeof Bot; label: string; active?: boolean }) { return <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", active ? "border-brand-blue/30 bg-brand-blue/10 text-brand-blue" : "border-border bg-card text-muted-foreground")}><Icon className="h-3.5 w-3.5" /><span className="font-medium">{label}</span></div> }

function RulesPanel() {
  const { rules, setRules } = useFirewall();
  const [draft, setDraft] = useState<Rules>(rules);
  const [saved, setSaved] = useState(false);
  
  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  function update<K extends keyof Rules>(key: K, value: Rules[K]) { setDraft((d) => ({ ...d, [key]: value })); setSaved(false); }
  
  async function save(event: FormEvent) { 
    event.preventDefault(); 
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
    } catch (err) {
      console.error("Error saving rules to Firestore:", err);
    }
  }
  return <div className="mx-auto max-w-3xl space-y-7"><div><p className="text-sm text-muted-foreground">Control what your agents can spend</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Firewall rules</h2></div><form onSubmit={save} className="rounded-2xl border border-brand-blue/20 bg-card p-6 sm:p-8"><div className="grid gap-6 sm:grid-cols-2"><NumberField label="Max order amount" hint="Hard cap per transaction" value={draft.maxOrder} onChange={(v) => update("maxOrder", v)} /><NumberField label="Daily spend limit" hint="Across all AI agents" value={draft.dailyLimit} onChange={(v) => update("dailyLimit", v)} /><NumberField label="Approval threshold" hint="Orders above this need you" value={draft.approvalAbove} onChange={(v) => update("approvalAbove", v)} /><NumberField label="Maximum discount" hint="Allowed agent discount" value={draft.maxDiscount} suffix="%" onChange={(v) => update("maxDiscount", v)} /></div><div className="mt-8 border-t border-border pt-6"><div className="mb-3"><h3 className="text-sm font-semibold text-brand-navy">Allowed categories</h3><p className="mt-1 text-xs text-muted-foreground">Requests outside these categories are blocked automatically.</p></div><div className="grid gap-2 sm:grid-cols-2">{CATEGORIES.map((category) => <label key={category} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition", draft.categories.includes(category) ? "border-brand-blue/40 bg-brand-blue/5 text-brand-navy" : "border-border text-muted-foreground")}><input type="checkbox" checked={draft.categories.includes(category)} onChange={(e) => update("categories", e.target.checked ? [...draft.categories, category] : draft.categories.filter((c) => c !== category))} className="h-4 w-4 accent-brand-blue" />{category}</label>)}</div></div><div className="mt-8 flex items-center justify-end gap-4 border-t border-border pt-6"><span className={cn("text-xs text-success transition", saved ? "opacity-100" : "opacity-0")}>Rules saved successfully</span><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"><Save className="h-4 w-4" />Save rules</button></div></form><div className="flex items-start gap-3 rounded-xl border border-brand-blue/15 bg-brand-blue/5 p-4 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />These policies are evaluated in order for every incoming agent request. Changes take effect immediately.</div></div>;
}
function NumberField({ label, hint, value, suffix = "₹", onChange }: { label: string; hint: string; value: number; suffix?: string; onChange: (value: number) => void }) { return <label className="block"><span className="text-sm font-semibold text-brand-navy">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{hint}</span><div className="relative mt-3"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">{suffix}</span><input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full rounded-xl border border-border bg-background pl-8 pr-3 font-mono text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15" /></div></label> }

function BuyerChat() {
  const { submitRequest } = useFirewall();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<{ from: "user" | "agent"; text: string; result?: ReturnType<typeof submitRequest> }[]>([{ from: "agent", text: "Hi! I’m your AI buyer. Tell me what you’d like me to purchase and I’ll run it through the firewall." }]);
  function send(event: FormEvent) { event.preventDefault(); if (!text.trim()) return; const request = text.trim(); const intent = parseIntent(request); const product = intent.product; if (!product) { setMessages((m) => [...m, { from: "user", text: request }, { from: "agent", text: "I couldn’t find a matching item in the catalog. Try “Buy me a wireless mouse under ₹1,500.”" }]); setText(""); return; } const result = submitRequest(product); setMessages((m) => [...m, { from: "user", text: request }, { from: "agent", text: `I found ${product.name} in ${product.category}. The request was evaluated by the firewall.`, result }]); setText(""); }
  function acceptAlternative(result: NonNullable<typeof messages[number]["result"]>) { if (!result.alternative) return; const next = submitRequest(result.alternative); setMessages((m) => [...m, { from: "user", text: `Accept ${result.alternative!.name} for ₹${result.alternative!.price.toLocaleString("en-IN")}` }, { from: "agent", text: `Alternative request sent through the firewall.`, result: next }]); }
  return <div className="mx-auto max-w-4xl"><div className="mb-7"><p className="text-sm text-muted-foreground">Simulate an autonomous purchase</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">AI Buyer</h2></div><div className="overflow-hidden rounded-2xl border border-brand-blue/20 bg-card"><div className="flex items-center gap-3 border-b border-border px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue"><Bot className="h-5 w-5" /></div><div><div className="text-sm font-semibold text-brand-navy">SentryPay shopping agent</div><div className="flex items-center gap-1 text-[11px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Connected to merchant catalog</div></div><span className="ml-auto rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">{AGENT_ID}</span></div><div className="min-h-[390px] space-y-5 bg-background/50 p-5 sm:p-7">{messages.map((message, i) => <div key={i} className={cn("flex gap-3", message.from === "user" && "justify-end")}><div className={cn("max-w-[90%] rounded-2xl px-4 py-3 text-sm", message.from === "user" ? "rounded-br-md bg-brand-blue text-white" : "rounded-bl-md border border-border bg-card text-brand-navy")}><p>{message.text}</p>{message.result && <DecisionCard result={message.result} onAccept={() => acceptAlternative(message.result!)} />}</div></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-border bg-card p-4"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Try: Buy me a wireless mouse under ₹1,500" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-brand-blue" /><button type="submit" className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition hover:brightness-110"><span className="hidden sm:inline">Send request</span><ArrowUpRight className="h-4 w-4" /></button></form></div></div>;
}
function DecisionCard({ result, onAccept }: { result: ReturnType<ReturnType<typeof useFirewall>["submitRequest"]>; onAccept: () => void }) { const config = ({ approved: ["Approved", "text-success", "bg-success/10", CheckCircle2], recovered: ["Recovery offer", "text-brand-blue", "bg-brand-blue/10", RefreshCw], escalated: ["Pending approval", "text-warning", "bg-warning/10", Clock3], blocked: ["Blocked", "text-destructive", "bg-destructive/10", Ban] } as const)[result.decision]; const Icon = config[3]; return <div className={cn("mt-3 rounded-xl border border-brand-blue/25 p-3", config[2])}><div className={cn("flex items-center gap-2 text-xs font-semibold", config[1])}><Icon className="h-4 w-4" />{config[0]}<span className="ml-auto font-mono text-[10px] uppercase">{result.decision}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.reason}</p>{result.entry?.orderId && <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-success"><Check className="h-3 w-3" />Order placed · {result.entry.orderId}</div>}{result.alternative && <div className="mt-3 flex items-center justify-between rounded-lg bg-card p-2.5"><div><div className="text-xs font-semibold text-brand-navy">{result.alternative.name}</div><div className="font-mono text-xs text-brand-navy">₹{result.alternative.price.toLocaleString("en-IN")}</div></div><button onClick={onAccept} className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">Accept</button></div>}</div> }

function ApprovalsPanel() { const { approvals, resolveApproval } = useFirewall(); const [, refresh] = useState(0); return <div className="space-y-7"><div><p className="text-sm text-muted-foreground">Human-in-the-loop decisions</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Approval queue</h2></div>{approvals.length === 0 ? <div className="rounded-2xl border border-brand-blue/20 bg-card"><EmptyState icon={CheckCircle2} text="No requests are waiting for approval. Everything is under control." /></div> : <div className="grid gap-4">{approvals.map((item) => <div key={item.id} className="flex flex-col gap-5 rounded-2xl border border-brand-blue/25 bg-card p-5 sm:flex-row sm:items-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"><Clock3 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-brand-navy">{item.product.name}</h3><span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Approval required</span></div><p className="mt-1 text-sm text-muted-foreground">AI Agent wants to spend <span className="font-mono font-semibold text-brand-navy">₹{item.amount.toLocaleString("en-IN")}</span> · {item.product.category}</p><p className="mt-2 text-xs text-muted-foreground">{item.reason}</p><div className="mt-2 font-mono text-[10px] text-muted-foreground">{item.id} · {new Date(item.time).toLocaleTimeString("en-IN")}</div></div><div className="flex shrink-0 gap-2"><button onClick={() => { resolveApproval(item.id, false); refresh((n) => n + 1); }} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5"><X className="h-3.5 w-3.5" />Deny</button><button onClick={() => { resolveApproval(item.id, true); refresh((n) => n + 1); }} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-semibold text-white hover:brightness-105"><Check className="h-3.5 w-3.5" />Approve</button></div></div>)}</div>}</div> }

function AuditPanel() { const { auditLog } = useFirewall(); return <div className="space-y-7"><div><p className="text-sm text-muted-foreground">Immutable event history</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Audit trail</h2></div><div className="rounded-2xl border border-brand-blue/20 bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4"><div><h3 className="font-semibold text-brand-navy">Hash-chained decisions</h3><p className="mt-1 text-xs text-muted-foreground">Every event is linked to the previous record</p></div><span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success"><ShieldCheck className="h-3 w-3" />Chain verified</span></div>{auditLog.length ? <div className="divide-y divide-border">{auditLog.map((entry) => <AuditRow key={entry.id} entry={entry} detailed />)}</div> : <EmptyState icon={Activity} text="Your audit trail will appear here as agents make purchase requests." />}</div></div> }
function AuditRow({ entry, detailed = false }: { entry: any; detailed?: boolean }) { const config = ({ approved: ["Approved", "text-success", "bg-success/10", CheckCircle2], blocked: ["Blocked", "text-destructive", "bg-destructive/10", Ban], escalated: ["Escalated", "text-warning", "bg-warning/10", Clock3], recovered: ["Recovered", "text-brand-blue", "bg-brand-blue/10", RefreshCw] } as const)[entry.decision as Decision]; const Icon = config[3]; return <div className="flex items-start gap-3 px-6 py-4"><div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config[2])}><Icon className={cn("h-4 w-4", config[1])} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-semibold text-brand-navy">{entry.product}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", config[2], config[1])}>{config[0]}</span><span className="ml-auto font-mono text-[10px] text-muted-foreground">{new Date(entry.time).toLocaleTimeString("en-IN")}</span></div><div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="font-mono font-medium text-brand-navy">₹{entry.amount.toLocaleString("en-IN")}</span><span>{entry.reason}</span></div>{detailed && <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground"><span className="rounded bg-muted px-2 py-1">hash: {entry.hash}</span><span className="rounded bg-muted px-2 py-1">agent: {entry.agent}</span></div>}</div></div> }
function EmptyState({ icon: Icon, text, action, actionLabel }: { icon: typeof Activity; text: string; action?: () => void; actionLabel?: string }) { return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><Icon className="h-8 w-8 text-muted-foreground/40" /><p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>{action && <button onClick={action} className="mt-4 text-xs font-semibold text-brand-blue hover:underline">{actionLabel}</button>}</div> }
