import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const [mobileNav, setMobileNav] = useState(false);

  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  function signOut() {
    logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-brand-navy text-white transition-transform lg:static lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-20 items-center gap-2 border-b border-white/10 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue"><ShieldCheck className="h-4 w-4" /></div>
          <span className="font-semibold tracking-tight">Sentry<span className="text-brand-blue">Pay</span></span>
        </div>
        <div className="px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Workspace</div>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => { setTab(item.id); setMobileNav(false); }} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition", tab === item.id ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/15" : "text-white/55 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4" />{item.label}{item.id === "approvals" && <ApprovalCount />}</button>;
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/20 text-xs font-semibold text-brand-blue">{merchantEmail?.[0]?.toUpperCase() ?? "M"}</div><div className="min-w-0"><div className="truncate text-xs font-medium text-white">{merchantEmail}</div><div className="text-[10px] text-white/40">Merchant workspace</div></div></div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/45 transition hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-brand-navy/70 lg:hidden" />}

      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-muted-foreground lg:hidden"><Menu className="h-5 w-5" /></button><div><div className="text-xs text-muted-foreground">Merchant workspace /</div><h1 className="text-lg font-semibold capitalize">{tab === "chat" ? "AI Buyer" : tab === "rules" ? "Firewall Rules" : tab === "audit" ? "Audit Trail" : tab === "approvals" ? "Approval Queue" : "Overview"}</h1></div></div>
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
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-brand-navy">Firewall activity</h3><p className="mt-1 text-xs text-muted-foreground">Every request passes through your policy engine</p></div><button onClick={() => onTab("chat")} className="text-xs font-semibold text-brand-blue hover:underline">Try a request <ChevronRight className="inline h-3 w-3" /></button></div><MiniFlow /></section><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-brand-navy">Active policy</h3><p className="mt-1 text-xs text-muted-foreground">Last saved just now</p></div><button onClick={() => onTab("rules")} className="text-xs font-semibold text-brand-blue hover:underline">Edit</button></div><div className="mt-6 space-y-4"><RuleLine label="Max order amount" value={`₹${rules.maxOrder.toLocaleString("en-IN")}`} /><RuleLine label="Daily spend limit" value={`₹${rules.dailyLimit.toLocaleString("en-IN")}`} /><RuleLine label="Approval threshold" value={`₹${rules.approvalAbove.toLocaleString("en-IN")}`} /><RuleLine label="Allowed categories" value={rules.categories.join(", ") || "None"} /></div></section></div>
    <section className="rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-6 py-4"><div><h3 className="font-semibold text-brand-navy">Recent decisions</h3><p className="mt-1 text-xs text-muted-foreground">Live audit stream</p></div><button onClick={() => onTab("audit")} className="text-xs font-semibold text-brand-blue">View all <ChevronRight className="inline h-3 w-3" /></button></div>{auditLog.length ? <div className="divide-y divide-border">{auditLog.slice(0, 4).map((entry) => <AuditRow key={entry.id} entry={entry} />)}</div> : <EmptyState icon={Activity} text="No requests yet. Open AI Buyer to simulate your first purchase." action={() => onTab("chat")} actionLabel="Open AI Buyer" />}</section>
  </div>;
}

function Stat({ label, value, trend, icon: Icon, color }: { label: string; value: string; trend: string; icon: typeof Activity; color: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", color === "blue" ? "bg-brand-blue/10 text-brand-blue" : color === "green" ? "bg-success/10 text-success" : color === "amber" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}><Icon className="h-4 w-4" /></div><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span></div><div className="mt-5 text-2xl font-bold font-mono tracking-tight text-brand-navy">{value}</div><div className="mt-1 text-xs text-muted-foreground">{trend}</div></div> }
function RuleLine({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono text-xs font-medium text-brand-navy">{value}</span></div> }
function MiniFlow() { return <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3"><FlowPill icon={Bot} label="AI Agent" /><ChevronRight className="h-4 w-4 text-muted-foreground" /><FlowPill icon={ShieldCheck} label="Firewall" active /><ChevronRight className="h-4 w-4 text-muted-foreground" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[[CheckCircle2,"Approved","text-success"],[RefreshCw,"Recovered","text-brand-blue"],[Clock3,"Escalated","text-warning"],[Ban,"Blocked","text-destructive"]].map(([Icon,label,color]) => <div key={String(label)} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-2"><Icon className={cn("h-3.5 w-3.5", String(color))} /><span className="text-[10px] font-medium">{String(label)}</span></div>)}</div></div> }
function FlowPill({ icon: Icon, label, active }: { icon: typeof Bot; label: string; active?: boolean }) { return <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", active ? "border-brand-blue/30 bg-brand-blue/10 text-brand-blue" : "border-border bg-card text-muted-foreground")}><Icon className="h-3.5 w-3.5" /><span className="font-medium">{label}</span></div> }
