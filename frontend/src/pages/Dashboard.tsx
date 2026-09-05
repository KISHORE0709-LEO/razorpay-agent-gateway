import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, collection, deleteDoc, getDocFromServer } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowUpRight,
  Ban,
  Bell,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
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
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  RotateCcw,
  User,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { fetchProductImage, DEFAULT_FALLBACK_IMAGE } from "@/lib/pexels";
import { CATEGORIES, CATALOG } from "@/lib/catalog";
import { AGENT_ID, useFirewall, SubmitResult } from "@/lib/store";
import { Decision, Product, Rules, Campaign, AuditEntry } from "@/lib/types";
import { PolicyStrategy } from "@shared/api";
import { generatePolicyStrategies } from "@/lib/advisor";
import { GENESIS_HASH, computeEntryHash, shortHash } from "@/lib/hash";
import { AgentTrustBadge } from "@/components/AgentTrustBadge";
import { OverviewCharts } from "@/components/OverviewCharts";
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
  { id: "campaigns", label: "Campaigns", icon: Sparkles },
  { id: "audit", label: "Verdict Chain", icon: Activity },
] as const;
type Tab = (typeof NAV)[number]["id"] | "settings";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, merchantEmail, logout } = useFirewall();
  const [tab, setTab] = useState<Tab>("overview");
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  function signOut() {
    logout();
    navigate("/");
  }

  const handleNavigateToAudit = (filter?: string) => {
    setAuditFilter(filter || "all");
    setTab("audit");
  };

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
          <button 
            onClick={() => setTab("settings")}
            className={cn(
              "mb-3 flex w-full items-center gap-3 rounded-lg p-3 text-left transition cursor-pointer group",
              tab === "settings"
                ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20 ring-1 ring-white/20"
                : "bg-white/5 hover:bg-white/10 text-white"
            )}
            title="Edit Merchant Profile & Settings"
          >
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
              tab === "settings"
                ? "bg-white text-brand-navy font-bold shadow-xs"
                : "bg-brand-blue/20 text-brand-blue group-hover:bg-brand-blue group-hover:text-white"
            )}>
              {merchantEmail?.[0]?.toUpperCase() ?? "M"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white">{merchantEmail}</div>
              <div className={cn("text-[10px] transition", tab === "settings" ? "text-white/80" : "text-white/40 group-hover:text-brand-blue/80")}>Merchant Settings · Edit</div>
            </div>
            <ChevronRight className={cn("h-3.5 w-3.5 transition", tab === "settings" ? "text-white translate-x-0.5" : "text-white/30 group-hover:text-white group-hover:translate-x-0.5")} />
          </button>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/45 transition hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <div className={cn("min-w-0 flex-1 transition-[padding] duration-300 ease-out flex flex-col h-full overflow-hidden", sidebarOpen ? "pl-72" : "pl-0")}>
        <header className="flex h-16 sm:h-20 shrink-0 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setSidebarOpen((open) => !open)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-brand-navy" title={sidebarOpen ? "Close sidebar" : "Open sidebar"}><Menu className="h-4 w-4" /></button>
            </div>
            <div>
              <h1 className="text-lg font-semibold capitalize">
                {tab === "chat" ? "AI Buyer" : tab === "rules" ? "Firewall Rules" : tab === "catalog" ? "Product Catalog" : tab === "campaigns" ? "Growth Campaigns" : tab === "audit" ? "Verdict Chain" : tab === "approvals" ? "Approval Queue" : tab === "settings" ? "Merchant Profile & Settings" : "Overview"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              System operational
            </div>
            <button
              onClick={() => setTab("settings")}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-center text-xs font-semibold text-brand-navy hover:bg-brand-blue hover:text-white transition cursor-pointer"
              title="Merchant Profile & Settings"
            >
              {merchantEmail?.[0]?.toUpperCase() ?? "M"}
            </button>
          </div>
        </header>
        <main className={cn("mx-auto w-full max-w-[1500px] flex-1 min-h-0", tab === "chat" ? "p-3 sm:p-4 lg:p-5 flex flex-col overflow-hidden" : "p-5 sm:p-8 overflow-y-auto")}>
          {tab === "overview" && <Overview onTab={setTab} onNavigateToAudit={handleNavigateToAudit} />}
          {tab === "chat" && <BuyerChat />}
          {tab === "rules" && <RulesPanel />}
          {tab === "catalog" && <CatalogPanel />}
          {tab === "approvals" && <ApprovalsPanel />}
          {tab === "campaigns" && <CampaignsPanel />}
          {tab === "audit" && <AuditPanel initialFilter={auditFilter} onFilterChange={setAuditFilter} />}
          {tab === "settings" && <MerchantProfilePanel />}
        </main>
      </div>
    </div>
  );
}

function ApprovalCount() { const { approvals } = useFirewall(); return approvals.length > 0 ? <span className="ml-auto rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-brand-navy">{approvals.length}</span> : null; }

function Overview({
  onTab,
  onNavigateToAudit,
}: {
  onTab: (tab: Tab) => void;
  onNavigateToAudit?: (filter?: string) => void;
}) {
  const { rules, dailySpent, auditLog, approvals, resolveApproval, resetDailySpend } = useFirewall();
  const [isResettingSpend, setIsResettingSpend] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);

  const isDev = Boolean(
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.search.includes("dev")
    ))
  );

  const handleResetSpend = async () => {
    if (isResettingSpend) return;
    setIsResettingSpend(true);
    try {
      const res = await resetDailySpend();
      setResetToast(`Reset today's spend counter to ₹0 (${res.deletedCount} dailySpend record${res.deletedCount === 1 ? "" : "s"} cleared)`);
      setTimeout(() => setResetToast(null), 5000);
    } catch (err: any) {
      console.error("Failed to reset daily spend:", err);
      setResetToast("Failed to reset spend. Please try again.");
      setTimeout(() => setResetToast(null), 4000);
    } finally {
      setIsResettingSpend(false);
    }
  };
  
  // Group outcome_updates with their original parent transactions
  const outcomeUpdatesByTxId = useMemo(() => {
    const map = new Map<string, AuditEntry>();
    auditLog.forEach((entry) => {
      if (entry.type === "outcome_update" && entry.relatedTransactionId) {
        map.set(entry.relatedTransactionId, entry);
      }
    });
    return map;
  }, [auditLog]);

  const today = new Date().toDateString();
  const todayLog = auditLog.filter((e) => {
    const d = new Date(e.time || e.timestamp || 0);
    return !isNaN(d.getTime()) && d.toDateString() === today;
  });
  
  // Primary transactions today (exclude outcome_updates from top-level request counts)
  const primaryTodayLog = todayLog.filter((e) => e.type !== "outcome_update");
  
  // Requests today: count of all purchase request transactions today
  const requestsToday = primaryTodayLog.length;
  
  // Approved volume: unified real-time sum of approved transactions today
  const approvedVolume = dailySpent;
  
  // Blocked requests: count of blocked transactions today (including denied escalations)
  const blockedToday = primaryTodayLog.filter((e) => {
    const linked = outcomeUpdatesByTxId.get(e.id);
    return e.decision === "blocked" || linked?.outcome === "denied";
  }).length;
  
  // Daily spend progress bar
  const dailySpendProgress = rules.dailyLimit > 0 ? Math.min((dailySpent / rules.dailyLimit) * 100, 100) : 0;
  
  // Saved via recovery: sum of savedAmount across recovered transactions today
  const savedViaRecovery = primaryTodayLog
    .filter((e) => e.decision === "recovered" && e.savedAmount)
    .reduce((sum, e) => sum + (e.savedAmount || 0), 0);

  const [drillDown, setDrillDown] = useState<{
    type: "requests" | "approved" | "approvals" | "blocked" | "recovered";
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: "blue" | "green" | "amber" | "red";
  } | null>(null);

  const [selectedVerdictEntry, setSelectedVerdictEntry] = useState<{
    entry: AuditEntry;
    linkedOutcome?: AuditEntry;
  } | null>(null);

  // For the pulse animation, track the most recent transaction
  const latestTxnId = auditLog.length > 0 ? auditLog[0].id : null;
  const latestDecision = auditLog.length > 0 ? auditLog[0].decision : null;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Good morning, merchant</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Your firewall at a glance</h2>
        </div>
        <div className="flex items-center gap-3">
          {isDev && (
            <button
              type="button"
              id="btn-reset-daily-spend"
              onClick={handleResetSpend}
              disabled={isResettingSpend}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition shadow-xs cursor-pointer"
              title="Dev testing: clear today's dailySpend documents so tests start from a clean ₹0 daily spend without inflating limit"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isResettingSpend ? "animate-spin text-amber-700" : "text-amber-700"}`} />
              {isResettingSpend ? "Resetting spend..." : "Reset today's spend"}
            </button>
          )}
          <div className="font-mono text-xs text-muted-foreground">
            LIVE • {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {resetToast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{resetToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setResetToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Requests today"
          value={String(requestsToday).padStart(2, "0")}
          trend="Live stream"
          icon={Activity}
          color="blue"
          onClick={() =>
            setDrillDown({
              type: "requests",
              title: "Today's Transaction Requests",
              subtitle: "All purchase attempts evaluated by SentryPay Firewall today",
              badge: `${requestsToday} Requests`,
              badgeColor: "blue",
            })
          }
        />
        <Stat
          label="Approved volume"
          value={`₹${approvedVolume.toLocaleString("en-IN")}`}
          trend={approvedVolume ? "Completed today" : "Awaiting first request"}
          icon={CheckCircle2}
          color="green"
          onClick={() =>
            setDrillDown({
              type: "approved",
              title: "Approved Purchase Volume",
              subtitle: "All orders automatically approved within policy limits and confirmed via Razorpay",
              badge: `₹${approvedVolume.toLocaleString("en-IN")}`,
              badgeColor: "green",
            })
          }
        />
        <Stat
          label="Approval queue"
          value={String(approvals.length).padStart(2, "0")}
          trend={approvals.length ? "Needs attention" : "All clear"}
          icon={Clock3}
          color="amber"
          onClick={() =>
            setDrillDown({
              type: "approvals",
              title: "Pending Approval Queue",
              subtitle: "Requests exceeding agent spending thresholds awaiting merchant sign-off",
              badge: `${approvals.length} Pending`,
              badgeColor: "amber",
            })
          }
        />
        <Stat
          label="Blocked requests"
          value={String(blockedToday).padStart(2, "0")}
          trend="Protected by rules"
          icon={Ban}
          color="red"
          onClick={() =>
            setDrillDown({
              type: "blocked",
              title: "Blocked Purchase Requests",
              subtitle: "Requests rejected by SentryPay firewall rules (spend limits, disallowed categories, low trust)",
              badge: `${blockedToday} Blocked`,
              badgeColor: "red",
            })
          }
        />
        
        <div
          onClick={() =>
            setDrillDown({
              type: "recovered",
              title: "Saved via Autonomous Recovery",
              subtitle: "Purchases salvaged when an agent accepted a policy-compliant alternative within budget",
              badge: `₹${savedViaRecovery.toLocaleString("en-IN")} Saved`,
              badgeColor: "blue",
            })
          }
          className="rounded-2xl border border-brand-blue/20 bg-card p-5 flex flex-col justify-between cursor-pointer hover:border-brand-blue/60 hover:shadow-md transition group"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue group-hover:scale-105 transition">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-brand-navy transition">
                Saved via recovery
              </span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-brand-blue transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
          <div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tracking-tight text-brand-navy">
                ₹{savedViaRecovery.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] font-semibold text-brand-blue opacity-0 group-hover:opacity-100 transition">
                Inspect ➔
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand-blue transition-all" style={{ width: `${dailySpendProgress}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>₹{dailySpent.toLocaleString("en-IN")} spent</span>
              <span>Limit: ₹{rules.dailyLimit.toLocaleString("en-IN")}</span>
            </div>
            {isDev && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  id="btn-reset-daily-spend-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetSpend();
                  }}
                  disabled={isResettingSpend}
                  className="text-[10px] font-mono font-medium text-amber-700 hover:text-amber-900 hover:underline inline-flex items-center gap-1 transition cursor-pointer"
                  title="Dev testing: clear today's dailySpend documents"
                >
                  <RotateCcw className={`h-2.5 w-2.5 ${isResettingSpend ? "animate-spin text-amber-800" : ""}`} />
                  Reset today's spend
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <OverviewCharts auditLog={auditLog} primaryTodayLog={primaryTodayLog} rules={rules} dailySpent={dailySpent} />

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
            <p className="mt-1 text-xs text-muted-foreground">Live verdict stream</p>
          </div>
          <button onClick={() => (onNavigateToAudit ? onNavigateToAudit("all") : onTab("audit"))} className="text-xs font-semibold text-brand-blue">
            View all <ChevronRight className="inline h-3 w-3" />
          </button>
        </div>
        {auditLog.length ? (
          <div className="divide-y divide-border">
            {auditLog.slice(0, 4).map((entry) => {
              const linkedOutcome = outcomeUpdatesByTxId.get(entry.id);
              return (
                <AuditRow
                  key={entry.id}
                  entry={entry}
                  linkedOutcome={linkedOutcome}
                  onSelect={() => setSelectedVerdictEntry({ entry, linkedOutcome })}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Activity} text="No requests yet. Open AI Buyer to simulate your first purchase." action={() => onTab("chat")} actionLabel="Open AI Buyer" />
        )}
      </section>

      {/* Drill-down modal for stat cards */}
      {drillDown && (
        <StatDrillDownModal
          drillDown={drillDown}
          todayLog={todayLog}
          approvals={approvals}
          rules={rules}
          dailySpent={dailySpent}
          outcomeUpdatesByTxId={outcomeUpdatesByTxId}
          onClose={() => setDrillDown(null)}
          onNavigateToAudit={onNavigateToAudit}
          onSelectVerdictEntry={(entry, linkedOutcome) => setSelectedVerdictEntry({ entry, linkedOutcome })}
          onResolveApproval={resolveApproval}
          onOpenChat={() => onTab("chat")}
        />
      )}

      {/* Deep block inspection modal */}
      {selectedVerdictEntry && (
        <VerdictDetailModal
          entry={selectedVerdictEntry.entry}
          linkedOutcome={selectedVerdictEntry.linkedOutcome}
          onClose={() => setSelectedVerdictEntry(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Activity;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-brand-blue/20 bg-card p-5 flex flex-col justify-between h-full transition",
        onClick && "cursor-pointer hover:border-brand-blue/60 hover:shadow-md group"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition",
            color === "blue"
              ? "bg-brand-blue/10 text-brand-blue group-hover:scale-105"
              : color === "green"
              ? "bg-success/10 text-success group-hover:scale-105"
              : color === "amber"
              ? "bg-warning/10 text-warning group-hover:scale-105"
              : "bg-destructive/10 text-destructive group-hover:scale-105"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-brand-navy transition">
            {label}
          </span>
          {onClick && (
            <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-brand-blue transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>
      </div>
      <div>
        <div className="mt-5 text-2xl font-bold font-mono tracking-tight text-brand-navy">{value}</div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{trend}</span>
          {onClick && (
            <span className="text-[10px] font-semibold text-brand-blue opacity-0 group-hover:opacity-100 transition">
              Inspect ➔
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatDrillDownModal({
  drillDown,
  todayLog,
  approvals,
  rules,
  dailySpent,
  outcomeUpdatesByTxId,
  onClose,
  onNavigateToAudit,
  onSelectVerdictEntry,
  onResolveApproval,
  onOpenChat,
}: {
  drillDown: {
    type: "requests" | "approved" | "approvals" | "blocked" | "recovered";
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: "blue" | "green" | "amber" | "red";
  };
  todayLog: AuditEntry[];
  approvals: any[];
  rules: Rules;
  dailySpent: number;
  outcomeUpdatesByTxId: Map<string, AuditEntry>;
  onClose: () => void;
  onNavigateToAudit?: (filter?: string) => void;
  onSelectVerdictEntry: (entry: AuditEntry, linkedOutcome?: AuditEntry) => void;
  onResolveApproval: (id: string, approve: boolean) => void;
  onOpenChat: () => void;
}) {
  const filteredEntries = useMemo(() => {
    // Only primary purchase requests should appear in drilldown lists (outcome_updates are linked delta blocks)
    const primary = todayLog.filter((e) => e.type !== "outcome_update");
    if (drillDown.type === "approved") {
      return primary.filter((e) => {
        const linked = outcomeUpdatesByTxId.get(e.id);
        return e.decision === "approved" || linked?.outcome === "approved";
      });
    }
    if (drillDown.type === "blocked") {
      return primary.filter((e) => {
        const linked = outcomeUpdatesByTxId.get(e.id);
        return e.decision === "blocked" || linked?.outcome === "denied";
      });
    }
    if (drillDown.type === "recovered") {
      return primary.filter((e) => e.decision === "recovered");
    }
    return primary;
  }, [drillDown.type, todayLog, outcomeUpdatesByTxId]);

  const badgeStyles = {
    blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
    green: "bg-success/10 text-success border-success/20",
    amber: "bg-warning/10 text-warning border-warning/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
  }[drillDown.badgeColor];

  const filterParam = {
    requests: "all",
    approved: "approved",
    blocked: "blocked",
    recovered: "recovered",
    approvals: "escalated",
  }[drillDown.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold border",
                badgeStyles
              )}
            >
              {drillDown.type === "approved" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : drillDown.type === "blocked" ? (
                <Ban className="h-5 w-5 text-destructive" />
              ) : drillDown.type === "approvals" ? (
                <Clock3 className="h-5 w-5 text-warning" />
              ) : drillDown.type === "recovered" ? (
                <RefreshCw className="h-5 w-5 text-brand-blue" />
              ) : (
                <Activity className="h-5 w-5 text-brand-blue" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-brand-navy">{drillDown.title}</h3>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-bold font-mono", badgeStyles)}>
                  {drillDown.badge}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{drillDown.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateToAudit?.(filterParam);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/30 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue hover:text-white transition cursor-pointer shadow-2xs"
              title="Open the complete cryptographic Verdict Chain"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Open in Verdict Chain ➔</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-brand-navy transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3.5">
          {drillDown.type === "approvals" ? (
            approvals.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-brand-navy">Approval Queue is Clear</h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  No requests currently require manual review. All purchases within limits were approved autonomously.
                </p>
              </div>
            ) : (
              approvals.map((item) => {
                const wouldExceed = rules.dailyLimit > 0 && dailySpent + (item.amount || 0) > rules.dailyLimit;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/[0.03] p-4 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-brand-navy">{item.product}</span>
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          Approval required
                        </span>
                        {wouldExceed && (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            Would exceed daily limit (₹{rules.dailyLimit.toLocaleString("en-IN")})
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Requested: <span className="font-mono font-bold text-brand-navy">₹{item.amount?.toLocaleString("en-IN")}</span>
                        {" • "}
                        <span>{item.reason}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span>{new Date(item.time).toLocaleTimeString("en-IN")}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span>agent: {item.agent}</span>
                          <AgentTrustBadge agentId={item.agent} initialScore={item.agentTrustScore} initialTier={item.agentTrustTier} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onResolveApproval(item.id, true)}
                        className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:brightness-105 transition cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onResolveApproval(item.id, false)}
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition cursor-pointer"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Activity className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-brand-navy">No matching transactions today</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                {drillDown.type === "approved"
                  ? "No purchases have been approved yet today. Start a shopping request in AI Buyer."
                  : drillDown.type === "blocked"
                  ? "No requests have been blocked today. Firewall rules have protected all operations."
                  : drillDown.type === "recovered"
                  ? "No purchases saved via recovery today yet."
                  : "No purchase requests have passed through the firewall today."}
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenChat();
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-105 transition cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Simulate request in AI Buyer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEntries.map((entry) => {
                const linkedOutcome = outcomeUpdatesByTxId.get(entry.id);
                const displayDecision = (entry.decision || (entry as any).outcome || "PENDING").toString();
                const isApproved = displayDecision.toLowerCase() === "approved" || linkedOutcome?.outcome === "approved";
                const isBlocked = displayDecision.toLowerCase() === "blocked" || linkedOutcome?.outcome === "denied";

                return (
                  <div
                    key={entry.id}
                    onClick={() => onSelectVerdictEntry(entry, linkedOutcome)}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 hover:border-brand-blue/50 hover:bg-muted/30 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-brand-navy group-hover:text-brand-blue transition">
                          {entry.product || "Purchase Request"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isApproved
                              ? "bg-success/10 text-success"
                              : isBlocked
                              ? "bg-destructive/10 text-destructive"
                              : displayDecision.toLowerCase() === "recovered"
                              ? "bg-brand-blue/10 text-brand-blue"
                              : displayDecision.toLowerCase() === "escalated"
                              ? "bg-warning/10 text-warning"
                              : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                          )}
                        >
                          {displayDecision.toUpperCase()}
                        </span>
                        {linkedOutcome && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              linkedOutcome.outcome === "approved"
                                ? "bg-success/15 text-success border border-success/30"
                                : "bg-destructive/15 text-destructive border border-destructive/30"
                            )}
                          >
                            RESOLVED: {(linkedOutcome.outcome || "RESOLVED").toUpperCase()}
                          </span>
                        )}
                        {entry.savedAmount ? (
                          <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-bold text-brand-blue font-mono">
                            Saved ₹{entry.savedAmount.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                        <span className="font-mono font-bold text-brand-navy">
                          ₹{entry.amount?.toLocaleString("en-IN")}
                        </span>
                        <span>•</span>
                        <span>{entry.reason}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span>{new Date(entry.time || entry.timestamp || "").toLocaleTimeString("en-IN")}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span>agent: {entry.agent || "agt_live"}</span>
                          <AgentTrustBadge agentId={entry.agent || "agt_live"} initialScore={entry.agentTrustScore} initialTier={entry.agentTrustTier} />
                        </span>
                        <span>·</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                          hash: {shortHash(entry.hash)}
                        </span>
                        {entry.orderId && (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">
                            order: {entry.orderId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-xs font-semibold text-brand-blue group-hover:translate-x-0.5 transition">
                      <span>Inspect block</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-blue" />
            <span>Cryptographically sealed under SHA-256 block ledger</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition cursor-pointer"
          >
            Close
          </button>
        </div>
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
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Policy Advisor state
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [strategies, setStrategies] = useState<PolicyStrategy[] | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function handleGetAdvisorSuggestions() {
    if (advisorOpen && strategies) {
      setAdvisorOpen(false);
      return;
    }
    setAdvisorOpen(true);
    setAdvisorLoading(true);
    try {
      const result = await generatePolicyStrategies("demo_merchant");
      setStrategies(result);
    } catch (err) {
      console.error("Failed to generate advisor strategies:", err);
    } finally {
      setAdvisorLoading(false);
    }
  }

  function applyStrategy(strat: PolicyStrategy) {
    if (!draft) return;
    setDraft({
      ...draft,
      maxOrder: strat.maxOrderAmount,
      dailyLimit: strat.dailySpendLimit,
      approvalAbove: strat.approvalThreshold,
      maxDiscount: strat.maxDiscountPercent,
      categories: [...strat.suggestedCategories],
    });
    setAppliedNotice(
      `Applied "${strat.name}" strategy parameters to draft! Review below and click "Save rules" to commit.`
    );
    setSaved(false);
    setError(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  // Dynamically listen to unique categories currently in the merchant's catalog
  useEffect(() => {
    const catalogRef = collection(db, "merchants/demo_merchant/catalog");
    const unsub = onSnapshot(
      catalogRef,
      (snap) => {
        const catSet = new Set<string>();
        snap.forEach((d) => {
          const cat = d.data()?.category;
          if (cat && typeof cat === "string" && cat.trim()) {
            catSet.add(cat.trim());
          }
        });
        const list = Array.from(catSet).sort((a, b) => a.localeCompare(b));
        setCatalogCategories(list);
        setLoadingCategories(false);
      },
      (err) => {
        console.error("Error listening to catalog categories in RulesPanel:", err);
        setLoadingCategories(false);
      }
    );
    return () => unsub();
  }, []);

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
          const res = await fetch(apiUrl("/api/rules?merchantId=demo_merchant"));
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
      const apiRes = await fetch(apiUrl("/api/rules"), {
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
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Control what your agents can spend</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Firewall rules</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGetAdvisorSuggestions}
            disabled={advisorLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-blue/20 hover:brightness-110 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {advisorLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            )}
            Get Advisor Suggestions
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Server Synced
          </span>
        </div>
      </div>

      {/* Policy Advisor Panel */}
      {advisorOpen && (
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 via-card to-card p-6 sm:p-7 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-navy">AI Policy Advisor</h3>
                <p className="text-xs text-muted-foreground">
                  Data-driven strategies modeled from your catalog price curve and 30-day transaction history.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetAdvisorSuggestions}
                disabled={advisorLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition hover:bg-muted"
                title="Refresh Suggestions"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", advisorLoading && "animate-spin")} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setAdvisorOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="Close Advisor Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {advisorLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-indigo-500" />
              <p className="text-sm font-medium text-brand-navy">Synthesizing merchant catalog & transaction metrics...</p>
              <p className="text-xs text-muted-foreground">Calibrating median price, risk boundaries, and volume cushions</p>
            </div>
          ) : strategies ? (
            <div className="grid gap-5 md:grid-cols-3">
              {strategies.map((strat) => {
                const isBalanced = strat.name === "Balanced";
                const isConservative = strat.name === "Conservative";
                const isGrowth = strat.name === "Growth";

                const borderClass = isBalanced
                  ? "border-brand-blue ring-1 ring-brand-blue/40 shadow-md bg-card"
                  : isGrowth
                  ? "border-purple-400/40 bg-card hover:border-purple-500/60 transition shadow-xs"
                  : "border-border bg-card hover:border-border/80 transition";

                const badgeBg = isBalanced
                  ? "bg-brand-blue text-white"
                  : isGrowth
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                  : "bg-muted text-muted-foreground";

                const IconComponent = isConservative ? ShieldCheck : isGrowth ? TrendingUp : Scale;

                return (
                  <div
                    key={strat.name}
                    className={cn("rounded-xl border p-5 flex flex-col justify-between space-y-4", borderClass)}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent
                            className={cn(
                              "h-4 w-4",
                              isBalanced ? "text-brand-blue" : isGrowth ? "text-purple-600" : "text-muted-foreground"
                            )}
                          />
                          <h4 className="font-bold text-brand-navy text-sm">{strat.name}</h4>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", badgeBg)}>
                          {isBalanced ? "Recommended" : isGrowth ? "Revenue Scale" : "Max Safety"}
                        </span>
                      </div>

                      {/* 4 Numbers Grid */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Max Order</span>
                          <span className="font-mono font-bold text-brand-navy">₹{strat.maxOrderAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Approval Above</span>
                          <span className="font-mono font-bold text-brand-navy">₹{strat.approvalThreshold.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Daily Spend Limit</span>
                          <span className="font-mono font-bold text-brand-navy">₹{strat.dailySpendLimit.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Max Discount</span>
                          <span className="font-mono font-bold text-brand-navy">{strat.maxDiscountPercent}%</span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {strat.reasoning}
                      </p>

                      {/* Suggested Categories */}
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                          Allowed Categories ({strat.suggestedCategories.length})
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {strat.suggestedCategories.map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-background border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyStrategy(strat)}
                      className={cn(
                        "w-full rounded-xl py-2.5 text-xs font-semibold transition active:scale-[0.98] cursor-pointer",
                        isBalanced
                          ? "bg-brand-blue text-white hover:brightness-110 shadow-sm"
                          : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                      )}
                    >
                      Apply this strategy
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* Applied Strategy Notification Banner */}
      {appliedNotice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-4 text-xs font-medium text-brand-navy animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-blue shrink-0" />
            <span>{appliedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedNotice(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Failed to save rules</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={save} ref={formRef} className="rounded-2xl border border-brand-blue/20 bg-card p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <NumberField label="Max order amount" hint="Hard cap per transaction" value={draft.maxOrder} onChange={(v) => update("maxOrder", v)} />
          <NumberField label="Daily spend limit" hint="Across all AI agents" value={draft.dailyLimit} onChange={(v) => update("dailyLimit", v)} />
          <NumberField label="Approval threshold" hint="Orders above this need you" value={draft.approvalAbove} onChange={(v) => update("approvalAbove", v)} />
          <NumberField label="Maximum discount" hint="Allowed agent discount" value={draft.maxDiscount} suffix="%" onChange={(v) => update("maxDiscount", v)} />
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-brand-navy">Allowed categories</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Dynamically synced with catalog. Requests outside checked categories are blocked automatically.
              </p>
            </div>
            {!loadingCategories && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {catalogCategories.length} in catalog
              </span>
            )}
          </div>

          {loadingCategories ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-blue" />
              <span>Scanning catalog for categories...</span>
            </div>
          ) : catalogCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No products found in catalog. Add products with categories to configure allowed categories.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {catalogCategories.map((category) => {
                const isChecked = draft.categories.some(
                  (c) => c.trim().toLowerCase() === category.trim().toLowerCase()
                );
                return (
                  <label
                    key={category}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition",
                      isChecked
                        ? "border-brand-blue/40 bg-brand-blue/5 text-brand-navy font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          update("categories", [
                            ...draft.categories.filter(
                              (c) => c.trim().toLowerCase() !== category.trim().toLowerCase()
                            ),
                            category,
                          ]);
                        } else {
                          update(
                            "categories",
                            draft.categories.filter(
                              (c) => c.trim().toLowerCase() !== category.trim().toLowerCase()
                            )
                          );
                        }
                      }}
                      className="h-4 w-4 accent-brand-blue"
                    />
                    {category}
                  </label>
                );
              })}
            </div>
          )}
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

  // Auto-fetch image loading state
  const [fetchingImage, setFetchingImage] = useState(false);

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

  // Compute summary stats live from actual product list
  const totalProducts = products.length;

  // Distinct categories actually present in live catalog products
  const distinctCatalogCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const totalCategories = distinctCatalogCategories.length;

  // Available options for Add/Edit product modal (distinct categories + default suggestions)
  const formCategories = useMemo(() => {
    const set = new Set<string>(distinctCatalogCategories);
    CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [distinctCatalogCategories]);

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
      category: formCategories[0] || "Electronics",
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
      category: formCategories.includes(prod.category) ? prod.category : "__CUSTOM__",
      customCategory: formCategories.includes(prod.category) ? "" : prod.category,
      price: prod.price,
      stock: prod.stock ?? 0,
      imageUrl: prod.imageUrl || "",
    });
    setModalOpen(true);
  }

  async function handleAutoFetchImage() {
    if (!form.name.trim()) return;
    setFetchingImage(true);
    try {
      const finalCategory =
        form.category === "__CUSTOM__"
          ? form.customCategory.trim() || "General"
          : form.category;
      const fetchedUrl = await fetchProductImage(form.name.trim(), finalCategory);
      if (fetchedUrl) {
        setForm((prev) => ({ ...prev, imageUrl: fetchedUrl }));
      }
    } catch (err) {
      console.error("Error auto-fetching image from Pexels:", err);
    } finally {
      setFetchingImage(false);
    }
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
      
      let finalImg = form.imageUrl.trim();
      // Requirement 2: If image URL is left blank, automatically call fetchProductImage
      if (!finalImg) {
        finalImg = await fetchProductImage(form.name.trim(), finalCategory);
      }

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
          <div className="mt-1 text-xs text-muted-foreground truncate" title={distinctCatalogCategories.join(", ")}>
            Across {totalCategories} active category {totalCategories === 1 ? "type" : "types"}
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
          {distinctCatalogCategories.map((cat) => {
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
                    src={product.imageUrl || DEFAULT_FALLBACK_IMAGE}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
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
                    {formCategories.map((cat) => (
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-brand-navy">
                    Image URL <span className="text-xs font-normal text-muted-foreground">(optional — auto-generates if empty)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFetchImage}
                    disabled={fetchingImage || !form.name.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue/80 disabled:opacity-40 transition cursor-pointer"
                    title="Auto-fetch a real photo for this product using Pexels"
                  >
                    <RefreshCw className={cn("h-3 w-3", fetchingImage && "animate-spin")} />
                    <span>{fetchingImage ? "Fetching..." : "Auto-fetch image"}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://... (leave empty to auto-fetch via Pexels)"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-brand-navy outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFetchImage}
                    disabled={fetchingImage || !form.name.trim()}
                    className="inline-flex items-center gap-1.5 shrink-0 rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-brand-blue/20 disabled:opacity-40 transition cursor-pointer"
                    title="Fetch high-res photo from Pexels based on product name"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-fetch
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                  <img
                    src={form.imageUrl.trim() || DEFAULT_FALLBACK_IMAGE}
                    alt="Preview"
                    className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground truncate">
                    Preview:{" "}
                    {form.imageUrl.trim()
                      ? "Custom URL loaded"
                      : "Will auto-fetch from Pexels on save if left empty"}
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
                    src={deleteItem.imageUrl || DEFAULT_FALLBACK_IMAGE}
                    alt={deleteItem.name}
                    className="h-9 w-9 rounded-md object-cover border border-border shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                    }}
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
    label: "Earbuds ₹1,499",
    query: "Buy wireless earbuds under 2000",
    description: "In-policy auto-purchase (within ₹2,000 threshold)",
    badge: "Auto Approved",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    icon: "⌚",
    label: "Smartwatch ₹2,999",
    query: "Buy smartwatch under 3500",
    description: "Above ₹2,000 threshold, tests human approval queue",
    badge: "Escalation",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  {
    icon: "🎧",
    label: "Headphones ₹7,999",
    query: "Buy noise cancelling headphones",
    description: "Exceeds ₹5,000 per-order limit, tests in-policy recovery offer",
    badge: "Recovery Offer",
    badgeClass: "text-brand-blue bg-brand-blue/10 border-brand-blue/20",
  },
  {
    icon: "🛡️",
    label: "Blocked Category",
    query: "Buy gold diamond jewelry",
    description: "Category not in allow-list, tests automated policy block",
    badge: "Policy Block",
    badgeClass: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  },
];

function BuyerChat() {
  const { sendChatRequest, submitRequest, resetAgentTrust } = useFirewall();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem("sentrypay-chat-session");
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingTrust, setResettingTrust] = useState(false);
  const [trustResetSuccess, setTrustResetSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleResetTrust() {
    setResettingTrust(true);
    try {
      await resetAgentTrust(AGENT_ID);
      setTrustResetSuccess(true);
      setTimeout(() => setTrustResetSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to reset agent trust:", err);
    } finally {
      setResettingTrust(false);
    }
  }

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

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function handleStartRename(s: ChatSession, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitle(s.title || "New chat");
  }

  async function handleSaveRename(id: string, e?: React.SyntheticEvent) {
    if (e) e.stopPropagation();
    const trimmed = editingTitle.trim() || "Untitled chat";
    const target = sessions.find((s) => s.id === id);
    if (!target) {
      setEditingSessionId(null);
      return;
    }
    const updated: ChatSession = {
      ...target,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditingSessionId(null);
    await persistSession("demo_merchant", updated);
  }

  function handleCancelRename(e?: React.SyntheticEvent) {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
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
      const next = await submitRequest(result.alternative, true);
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

  async function acceptEnhance(result: SubmitResult) {
    if (!result.enhancedProduct || !activeSession) return;
    setLoading(true);
    try {
      const next = await submitRequest(result.enhancedProduct, false, true, false);
      const now = new Date().toISOString();
      const userAcceptMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: `Upgrade my order to ${result.enhancedProduct.name} for ₹${result.enhancedProduct.price.toLocaleString("en-IN")}`,
        timestamp: now,
      };
      const agentOutcomeMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}_agent`,
        role: "agent",
        content: `Upgraded order evaluated and processed through firewall policy.`,
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

  async function declineEnhance(result: SubmitResult) {
    if (!activeSession) return;
    const originalProd = result.parsedProduct;
    if (!originalProd) return;
    setLoading(true);
    try {
      const next = await submitRequest(originalProd, false, false, true);
      const now = new Date().toISOString();
      const userDeclineMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: `Proceed with original order: ${originalProd.name} for ₹${originalProd.price.toLocaleString("en-IN")}`,
        timestamp: now,
      };
      const agentOutcomeMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}_agent`,
        role: "agent",
        content: `Proceeded with original item. Evaluated and processed through firewall policy.`,
        timestamp: new Date().toISOString(),
        transactionId: next.transactionId,
        result: next,
      };

      const updatedSession: ChatSession = {
        ...activeSession,
        updatedAt: new Date().toISOString(),
        messages: [...activeSession.messages, userDeclineMsg, agentOutcomeMsg],
      };

      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      await persistSession("demo_merchant", updatedSession);
    } finally {
      setLoading(false);
    }
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
                const isEditing = s.id === editingSessionId;
                const lastMsg = s.messages[s.messages.length - 1];
                return (
                  <div
                    key={s.id}
                    onClick={() => !isEditing && handleSelectSession(s.id)}
                    className={cn(
                      "group relative flex cursor-pointer flex-col rounded-xl p-3 text-left transition",
                      isActive
                        ? "bg-brand-blue/10 border border-brand-blue/40 shadow-xs"
                        : "hover:bg-muted/60 border border-transparent"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(s.id, e);
                            if (e.key === "Escape") handleCancelRename(e);
                          }}
                          className="w-full rounded-md border border-brand-blue bg-background px-2 py-1 text-xs font-semibold text-brand-navy focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
                          placeholder="Chat title..."
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(s.id, e)}
                          title="Save title"
                          className="rounded-md p-1 text-success hover:bg-success/10 transition cursor-pointer shrink-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          title="Cancel"
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 pr-14">
                          <div className={cn("truncate text-xs font-semibold", isActive ? "text-brand-navy" : "text-foreground")}>
                            {s.title || "New chat"}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatSessionTime(s.updatedAt || s.createdAt)}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground pr-14">
                            {lastMsg.content}
                          </p>
                        )}
                        <div className="absolute right-2 bottom-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(s, e)}
                            title="Rename chat"
                            className="p-1 text-muted-foreground hover:text-brand-blue transition rounded-md hover:bg-background/80 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            title="Delete session"
                            className="p-1 text-muted-foreground hover:text-destructive transition rounded-md hover:bg-background/80 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
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
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {AGENT_ID}
                </span>
                <AgentTrustBadge agentId={AGENT_ID} />
                <button
                  type="button"
                  onClick={handleResetTrust}
                  disabled={resettingTrust}
                  title="Reset agent trust score to 50 (Neutral)"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-brand-navy hover:bg-muted transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={cn("h-3 w-3", resettingTrust && "animate-spin")} />
                  <span className="hidden md:inline">{trustResetSuccess ? "Reset to 50!" : "Reset Trust"}</span>
                </button>
              </div>
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
                              onAcceptEnhance={() => acceptEnhance(message.result!)}
                              onDeclineEnhance={() => declineEnhance(message.result!)}
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
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-brand-navy transition hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50 cursor-pointer"
              >
                <span>{item.icon}</span>
                <span>{item.query}</span>
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={(e) => { e.preventDefault(); sendPrompt(); }} className="border-t border-border bg-card p-3 sm:p-4 shrink-0">
            <div className="relative flex items-end rounded-xl border border-border/80 bg-background shadow-2xs focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15 transition">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Message AI Buyer (e.g. 'I want to buy the Pro Wireless Earbuds for ₹2,499')..."
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32 min-h-[44px]"
              />
              <div className="flex items-center gap-1 p-2 shrink-0">
                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-white transition hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="hidden sm:inline font-mono text-[10px]">Connected to Razorpay Test Gateway</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ 
  result, 
  onAccept, 
  onDecline,
  onAcceptEnhance,
  onDeclineEnhance,
  onSelectSuggestion
}: { 
  result: SubmitResult; 
  onAccept: () => void; 
  onDecline: () => void; 
  onAcceptEnhance?: () => void;
  onDeclineEnhance?: () => void;
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
                    src={item.imageUrl || DEFAULT_FALLBACK_IMAGE} 
                    alt={item.name}
                    className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE; }}
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
    enhanced: ["Enhance offer", "text-indigo-600 dark:text-indigo-400", "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800", Sparkles],
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
                  src={result.parsedProduct.imageUrl || DEFAULT_FALLBACK_IMAGE}
                  alt={result.parsedProduct.name}
                  className="h-12 w-12 rounded-lg object-cover border border-border/80 shrink-0 shadow-2xs"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE; }}
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
                src={result.alternative.imageUrl || DEFAULT_FALLBACK_IMAGE}
                alt={result.alternative.name}
                className="h-11 w-11 rounded-md object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE; }}
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

      {/* Outcome: Enhance offer card (Upsell/Cross-sell) with Accept and Decline */}
      {result.decision === "enhanced" && result.enhancedProduct && (
        <div className="mt-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                {result.enhancedProduct.category === result.parsedProduct?.category ? "Upsell Recommendation" : "Complementary Cross-Sell"}
              </span>
            </div>
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
              Within Policy Cap
            </span>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={result.enhancedProduct.imageUrl || DEFAULT_FALLBACK_IMAGE}
                alt={result.enhancedProduct.name}
                className="h-12 w-12 rounded-lg object-cover border border-border shrink-0 shadow-2xs"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE; }}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-navy truncate">{result.enhancedProduct.name}</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{result.enhancedProduct.price.toLocaleString("en-IN")}
                  </span>
                  {result.parsedProduct && (
                    <span className="font-mono text-[11px] text-muted-foreground line-through">
                      ₹{result.parsedProduct.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Category: <span className="font-medium text-foreground">{result.enhancedProduct.category}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2.5">
            <button 
              onClick={onDeclineEnhance || onDecline} 
              className="rounded-lg border border-muted-foreground/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted cursor-pointer"
            >
              Keep original ({result.parsedProduct?.name ? `₹${result.parsedProduct.price.toLocaleString("en-IN")}` : "proceed"})
            </button>
            <button 
              onClick={onAcceptEnhance || onAccept} 
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              Upgrade my order (₹{result.enhancedProduct.price.toLocaleString("en-IN")})
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
                src={result.parsedProduct.imageUrl || DEFAULT_FALLBACK_IMAGE}
                alt={result.parsedProduct.name}
                className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE; }}
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
  const { resolveApproval, approvals, rules, dailySpent } = useFirewall();
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const handleAction = async (id: string, approve: boolean) => {
    setResolvingIds((prev) => new Set(prev).add(id));
    try {
      await resolveApproval(id, approve);
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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
            {approvals.map((item) => {
              const wouldExceedLimit = rules.dailyLimit > 0 && (dailySpent + (item.amount || 0)) > rules.dailyLimit;
              const isResolving = resolvingIds.has(item.id);
              return (
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
                    {wouldExceedLimit && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        Would exceed daily limit (₹{rules.dailyLimit.toLocaleString("en-IN")})
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI Agent wants to spend <span className="font-mono font-semibold text-brand-navy">₹{item.amount?.toLocaleString("en-IN")}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span>ID: {item.id}</span>
                    <span>·</span>
                    <span>{new Date(item.time).toLocaleTimeString("en-IN")}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span>agent: {item.agent || AGENT_ID}</span>
                      <AgentTrustBadge
                        agentId={item.agent || AGENT_ID}
                        initialScore={item.agentTrustScore}
                        initialTier={item.agentTrustTier}
                      />
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleAction(item.id, false)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isResolving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Deny
                  </button>
                  <button
                    onClick={() => handleAction(item.id, true)}
                    disabled={isResolving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3.5 py-2 text-xs font-semibold text-white hover:brightness-105 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isResolving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AuditPanel({
  initialFilter = "all",
  onFilterChange,
}: {
  initialFilter?: string;
  onFilterChange?: (filter: string) => void;
} = {}) {
  const { auditLog, alignChain } = useFirewall();
  const [filter, setFilter] = useState<string>(initialFilter);
  const [verifying, setVerifying] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    valid: boolean;
    count: number;
    errorMsg?: string;
  }>({ checked: false, valid: false, count: 0 });
  const [selectedEntry, setSelectedEntry] = useState<{
    entry: AuditEntry;
    linkedOutcome?: AuditEntry;
  } | null>(null);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const handleSetFilter = (newFilter: string) => {
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  // Group outcome_updates with their original parent transactions
  const { outcomeUpdatesByTxId, primaryEntries } = useMemo(() => {
    const map = new Map<string, AuditEntry>();
    const primaries: AuditEntry[] = [];

    // Collect outcome updates by parent ID
    auditLog.forEach((entry) => {
      if (entry.type === "outcome_update" && entry.relatedTransactionId) {
        map.set(entry.relatedTransactionId, entry);
      }
    });

    // Collect primary transactions (non-outcome_updates)
    auditLog.forEach((entry) => {
      if (entry.type !== "outcome_update") {
        primaries.push(entry);
      }
    });

    return { outcomeUpdatesByTxId: map, primaryEntries: primaries };
  }, [auditLog]);

  const filteredPrimaryEntries = useMemo(() => {
    if (filter === "all") return primaryEntries;
    return primaryEntries.filter((e) => {
      if (filter === "approved") return e.decision === "approved";
      if (filter === "blocked") return e.decision === "blocked";
      if (filter === "escalated") return e.decision === "escalated";
      if (filter === "recovered") return e.decision === "recovered";
      if (filter === "enhanced") return e.decision === "enhanced";
      return true;
    });
  }, [primaryEntries, filter]);

  const verifyChain = async () => {
    setVerifying(true);
    setVerificationResult({ checked: false, valid: false, count: 0 });

    // Verification delay for visual confirmation
    await new Promise((r) => setTimeout(r, 600));

    // Chain is ordered newest-first, reverse to verify chronologically from genesis block
    const chain = [...auditLog].reverse();
    let currentPrev = GENESIS_HASH;
    let valid = true;
    let errorMsg: string | undefined = undefined;

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];

      // 1. Verify prevHash links to previous block
      if (entry.prevHash && entry.prevHash !== currentPrev) {
        valid = false;
        errorMsg = `Chain linkage broken at block #${i + 1} (${entry.product || entry.relatedTransactionId || entry.id}). Expected prevHash: ${currentPrev.slice(0, 10)}... Found: ${entry.prevHash.slice(0, 10)}...`;
        break;
      }

      // 2. Recompute SHA-256 hash using immutable creation fields across ALL entries (including outcome_update)
      const computed = await computeEntryHash(entry.prevHash || GENESIS_HASH, entry);

      if (entry.hash && computed !== entry.hash) {
        valid = false;
        errorMsg = `Hash mismatch at block #${i + 1} (${entry.product || entry.relatedTransactionId || entry.id}). Cryptographic integrity corrupted!`;
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

  const handleRepairChain = async () => {
    setRepairing(true);
    try {
      const res = await alignChain();
      if (res.success) {
        // Wait briefly for Firestore real-time listener to sync
        await new Promise((r) => setTimeout(r, 800));
        await verifyChain();
      } else {
        alert("Failed to re-align chain. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error repairing chain.");
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Cryptographic transaction ledger</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Verdict Chain</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-blue/20 bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h3 className="font-semibold text-brand-navy">Hash-chained decisions</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Every event is cryptographically linked to the previous SHA-256 block using immutable creation fields
            </p>
          </div>
          <div className="flex items-center gap-2">
            {verificationResult.checked ? (
              verificationResult.valid ? (
                <>
                  <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
                    <ShieldCheck className="h-4 w-4" />
                    Chain verified ({verificationResult.count} blocks intact)
                  </span>
                  <button
                    onClick={verifyChain}
                    disabled={verifying || repairing}
                    className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="Re-verify chain"
                  >
                    <RefreshCw className={cn("h-3 w-3", verifying && "animate-spin")} />
                    Re-verify
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span className="max-w-md truncate">{verificationResult.errorMsg}</span>
                  </span>
                  <button
                    onClick={handleRepairChain}
                    disabled={repairing || verifying}
                    className="flex items-center gap-1.5 rounded-full bg-destructive text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-destructive/90 disabled:opacity-50 transition cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", repairing && "animate-spin")} />
                    {repairing ? "Repairing & Re-aligning..." : "Repair Chain"}
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={verifyChain}
                disabled={verifying || auditLog.length === 0}
                className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3.5 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/20 disabled:opacity-50 transition cursor-pointer"
              >
                {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {verifying ? "Verifying SHA-256 Chain..." : "Verify chain"}
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/20 px-6 py-2.5 overflow-x-auto">
          {[
            { id: "all", label: "All Decisions", count: primaryEntries.length },
            { id: "approved", label: "Approved", count: primaryEntries.filter((e) => e.decision === "approved").length },
            { id: "recovered", label: "Recovered", count: primaryEntries.filter((e) => e.decision === "recovered").length },
            { id: "escalated", label: "Escalated", count: primaryEntries.filter((e) => e.decision === "escalated").length },
            { id: "blocked", label: "Blocked", count: primaryEntries.filter((e) => e.decision === "blocked").length },
            { id: "enhanced", label: "Enhanced", count: primaryEntries.filter((e) => e.decision === "enhanced").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSetFilter(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0",
                filter === tab.id
                  ? "bg-brand-blue text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px]",
                  filter === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {filteredPrimaryEntries.length ? (
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filteredPrimaryEntries.map((entry) => {
                const linkedOutcome = outcomeUpdatesByTxId.get(entry.id);
                return (
                  <VerdictChainRow
                    key={entry.id}
                    entry={entry}
                    linkedOutcome={linkedOutcome}
                    onSelect={() => setSelectedEntry({ entry, linkedOutcome })}
                    detailed
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            text={
              filter === "all"
                ? "Your verdict chain will appear here as agents make purchase requests."
                : `No ${filter} decisions recorded in the verdict chain yet.`
            }
          />
        )}
      </div>

      {/* Click-to-Expand Detail Modal */}
      {selectedEntry && (
        <VerdictDetailModal
          entry={selectedEntry.entry}
          linkedOutcome={selectedEntry.linkedOutcome}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

function VerdictDetailModal({
  entry,
  linkedOutcome,
  onClose,
}: {
  entry: AuditEntry;
  linkedOutcome?: AuditEntry;
  onClose: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const config = {
    approved: ["Approved", "text-success", "bg-success/10", "border-success", CheckCircle2],
    blocked: ["Blocked", "text-destructive", "bg-destructive/10", "border-destructive", Ban],
    escalated: ["Escalated", "text-warning", "bg-warning/10", "border-warning", Clock3],
    recovered: ["Recovered", "text-brand-blue", "bg-brand-blue/10", "border-brand-blue", RefreshCw],
    enhanced: ["Enhanced", "text-indigo-600 dark:text-indigo-400", "bg-indigo-50 dark:bg-indigo-950/40", "border-indigo-400", Sparkles],
  };
  const decisionKey = (entry.decision || (entry as any).outcome || "unknown").toLowerCase();
  const [label, textCol, bgCol, , Icon] = (config as Record<string, any>)[decisionKey] || [
    "Unknown",
    "text-muted-foreground",
    "bg-muted",
    "border-muted",
    Activity,
  ];

  const catalogItem = CATALOG.find(
    (p) =>
      p.id === (entry as any).productId ||
      p.name.toLowerCase() === (entry.product || "").toLowerCase()
  );
  const productImageUrl = (entry as any).imageUrl || catalogItem?.imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            {productImageUrl ? (
              <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-border bg-muted/40 shadow-xs">
                <img
                  src={productImageUrl}
                  alt={entry.product || "Product"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                  }}
                />
                <div className={cn("absolute bottom-0 right-0 p-0.5 rounded-tl-md", bgCol, textCol)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
            ) : (
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgCol, textCol)}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-brand-navy">{entry.product || "Transaction"}</h3>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", bgCol, textCol)}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">Block ID: {entry.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-brand-navy transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Agent ID</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-brand-navy">{entry.agent || "agt_live_7f3c9e"}</span>
              <AgentTrustBadge
                agentId={entry.agent || "agt_live_7f3c9e"}
                initialScore={entry.agentTrustScore}
                initialTier={entry.agentTrustTier}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Requested Amount</span>
            <div className="text-base font-mono font-bold text-brand-navy">
              ₹{entry.amount?.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Timestamp</span>
            <div className="text-xs font-medium text-brand-navy">
              {new Date(entry.time || entry.timestamp || "").toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{entry.time || entry.timestamp}</div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Creation Decision</span>
            <div className="text-xs font-semibold text-brand-navy capitalize flex items-center gap-2">
              <span>{entry.decision}</span>
              {entry.orderId && (
                <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">
                  Order: {entry.orderId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Applied info (if influenced by active campaign) */}
        {entry.campaignApplied && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-brand-navy">Active Campaign Applied:</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{entry.campaignApplied}</span>
            </div>
            <span className="rounded bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              ORCHESTRATOR
            </span>
          </div>
        )}

        {/* Enhanced Product info (if upsell/cross-sell offer) */}
        {entry.enhancedProduct && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-card p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enhanced Offer Item</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-brand-navy">{entry.enhancedProduct.name} ({entry.enhancedProduct.category})</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">₹{entry.enhancedProduct.price.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {/* Full Reason Text */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
          <span className="text-xs font-semibold text-brand-navy">Full Reason Text</span>
          <p className="text-xs text-muted-foreground leading-relaxed">{entry.reason}</p>
        </div>

        {/* Cryptographic Proof Hashes */}
        <div className="space-y-3 rounded-xl border border-brand-blue/20 bg-brand-blue/[0.03] p-4">
          <h4 className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-blue" />
            Cryptographic SHA-256 Hashes
          </h4>

          <div className="space-y-2.5 text-xs">
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span className="font-medium">Entry Hash (Block SHA-256)</span>
                <button
                  onClick={() => copyToClipboard(entry.hash, "hash")}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline cursor-pointer"
                >
                  {copiedKey === "hash" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "hash" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="rounded-lg bg-card border border-border p-2 font-mono text-[11px] text-brand-navy break-all select-all">
                {entry.hash || "pending"}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span className="font-medium">Previous Block Hash (prevHash)</span>
                <button
                  onClick={() => copyToClipboard(entry.prevHash || GENESIS_HASH, "prevHash")}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline cursor-pointer"
                >
                  {copiedKey === "prevHash" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "prevHash" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="rounded-lg bg-card border border-border p-2 font-mono text-[11px] text-muted-foreground break-all select-all">
                {entry.prevHash || GENESIS_HASH}
              </div>
            </div>
          </div>
        </div>

        {/* Linked Merchant Outcome Update (if exists) */}
        {linkedOutcome && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-brand-navy flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-2 w-2 rounded-full",
                    linkedOutcome.outcome === "approved" ? "bg-success" : "bg-destructive"
                  )}
                />
                Linked Merchant Resolution
              </h4>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  linkedOutcome.outcome === "approved"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                )}
              >
                {linkedOutcome.outcome}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{linkedOutcome.reason}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-card border border-border p-2.5">
                <span className="text-[10px] text-muted-foreground block">Resolved Timestamp</span>
                <span className="font-mono text-[11px] text-brand-navy">
                  {new Date(linkedOutcome.time || linkedOutcome.timestamp || "").toLocaleString("en-IN")}
                </span>
              </div>
              {linkedOutcome.orderId && (
                <div className="rounded-lg bg-card border border-border p-2.5">
                  <span className="text-[10px] text-muted-foreground block">Razorpay Order ID</span>
                  <span className="font-mono text-[11px] text-success">{linkedOutcome.orderId}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span className="font-medium">Outcome Block Hash</span>
                <button
                  onClick={() => copyToClipboard(linkedOutcome.hash, "outcomeHash")}
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline cursor-pointer"
                >
                  {copiedKey === "outcomeHash" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === "outcomeHash" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="rounded-lg bg-card border border-border p-2 font-mono text-[11px] text-brand-navy break-all select-all">
                {linkedOutcome.hash}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-semibold text-white hover:brightness-105 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function VerdictChainRow({
  entry,
  linkedOutcome,
  onSelect,
  detailed = false,
}: {
  entry: any;
  linkedOutcome?: any;
  onSelect?: () => void;
  detailed?: boolean;
}) {
  const config = {
    approved: ["Approved", "text-success", "bg-success/10", CheckCircle2, "border-success"],
    blocked: ["Blocked", "text-destructive", "bg-destructive/10", Ban, "border-destructive"],
    escalated: ["Escalated", "text-warning", "bg-warning/10", Clock3, "border-warning"],
    recovered: ["Recovered", "text-brand-blue", "bg-brand-blue/10", RefreshCw, "border-brand-blue"],
    enhanced: ["Enhanced", "text-indigo-600 dark:text-indigo-400", "bg-indigo-50 dark:bg-indigo-950/40", Sparkles, "border-indigo-400"],
  };
  const decisionKey = (entry.decision || entry.outcome || (entry.type === "outcome_update" ? "approved" : "unknown")).toLowerCase();
  const itemConfig =
    (config as Record<string, any>)[decisionKey] || [
      "Unknown",
      "text-muted-foreground",
      "bg-muted",
      Activity,
      "border-muted",
    ];

  const Icon = itemConfig[3];

  const catalogItem = CATALOG.find(
    (p) =>
      p.id === (entry as any).productId ||
      p.name.toLowerCase() === (entry.product || "").toLowerCase()
  );
  const productImageUrl = (entry as any).imageUrl || catalogItem?.imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={cn(
        "flex flex-col px-6 py-4 border-l-4 transition cursor-pointer hover:bg-muted/30 group",
        itemConfig[4]
      )}
    >
      <div className="flex items-start gap-3">
        {productImageUrl ? (
          <div className="relative mt-0.5 h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-border bg-muted/30">
            <img
              src={productImageUrl}
              alt={entry.product || "Product"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
              }}
            />
            <div className={cn("absolute bottom-0 right-0 p-0.5 rounded-tl-sm", itemConfig[2])}>
              <Icon className={cn("h-2.5 w-2.5", itemConfig[1])} />
            </div>
          </div>
        ) : (
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", itemConfig[2])}>
            <Icon className={cn("h-4 w-4", itemConfig[1])} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-brand-navy group-hover:text-brand-blue transition">
              {entry.product}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", itemConfig[2], itemConfig[1])}>
              {itemConfig[0]}
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {new Date(entry.time || entry.timestamp || "").toLocaleTimeString("en-IN")}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-brand-navy">₹{entry.amount?.toLocaleString("en-IN")}</span>
            <span>{entry.reason}</span>
          </div>

          {detailed && (
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span className="rounded bg-muted px-2 py-1">
                hash: {entry.hash ? `${entry.hash.slice(0, 14)}...` : "pending"}
              </span>
              <span className="rounded bg-muted px-2 py-1">
                prev: {entry.prevHash ? `${entry.prevHash.slice(0, 14)}...` : "none"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1">
                <span>agent: {entry.agent || "agt_live_7f3c9e"}</span>
                <AgentTrustBadge
                  agentId={entry.agent || "agt_live_7f3c9e"}
                  initialScore={entry.agentTrustScore}
                  initialTier={entry.agentTrustTier}
                />
              </span>
              {entry.orderId && (
                <span className="rounded bg-success/10 text-success px-2 py-1">order: {entry.orderId}</span>
              )}
              {entry.campaignApplied && (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 font-medium">
                  <Sparkles className="h-3 w-3" />
                  <span>campaign: {entry.campaignApplied}</span>
                </span>
              )}
            </div>
          )}

          {/* Linked Merchant Resolution Line (Visual Grouping) */}
          {linkedOutcome && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs">
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                  linkedOutcome.outcome === "approved"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                )}
              >
                {linkedOutcome.outcome === "approved" ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
              </div>
              <span className="font-semibold text-brand-navy">
                → {linkedOutcome.outcome === "approved" ? "Approved" : "Denied"} by merchant
              </span>
              <span className="text-muted-foreground">
                at {new Date(linkedOutcome.time || linkedOutcome.timestamp || "").toLocaleTimeString("en-IN")}
              </span>
              {linkedOutcome.orderId && (
                <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">
                  order: {linkedOutcome.orderId}
                </span>
              )}
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                hash: {shortHash(linkedOutcome.hash)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AuditRow(props: any) {
  return <VerdictChainRow {...props} />;
}

function CampaignsPanel() {
  const { rules } = useFirewall();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Subscribe to real-time campaigns in Firestore
  useEffect(() => {
    const q = collection(db, "merchants/demo_merchant/campaigns");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Campaign[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Campaign));
        // Sort: active first, then suggested, then expired
        list.sort((a, b) => {
          const order = { active: 0, suggested: 1, expired: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        setCampaigns(list);
      },
      (err) => console.error("Campaigns listener error:", err)
    );
    return () => unsub();
  }, []);

  // Fetch or trigger suggestions on first load if none exist
  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch(apiUrl("/api/campaigns?merchantId=demo_merchant"));
      if (res.ok) {
        const data = await res.json();
        if (data.campaigns) {
          setCampaigns(data.campaigns);
        }
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  }

  async function runOrchestrator() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(apiUrl("/api/campaigns/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId: "demo_merchant" }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.campaigns) setCampaigns(data.campaigns);
        const count = data.count !== undefined ? data.count : (data.suggestions?.length || 0);
        if (count > 0) {
          setMessage({
            text: `Orchestrator generated ${count} new smart campaign${count === 1 ? "" : "s"} based on 7-day transaction history & agent trust telemetry.`,
            type: "success",
          });
        } else {
          setMessage({
            text: `All campaign suggestions are already up to date. No duplicate suggestions created.`,
            type: "success",
          });
        }
      } else {
        setMessage({ text: data.error || "Failed to generate suggestions", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error running campaign orchestrator", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(campaignId: string) {
    setActivatingId(campaignId);
    setMessage(null);
    try {
      const res = await fetch(apiUrl("/api/campaigns/activate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId: "demo_merchant", campaignId, durationHours: 48 }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Campaign activated for 48 hours! Override is now active in firewall evaluation.", type: "success" });
        await fetchCampaigns();
      } else {
        setMessage({ text: data.error || "Activation failed", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error activating campaign", type: "error" });
    } finally {
      setLoading(false);
      setActivatingId(null);
    }
  }

  async function handleDeactivate(campaignId: string) {
    setMessage(null);
    try {
      const res = await fetch(apiUrl("/api/campaigns/deactivate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId: "demo_merchant", campaignId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Campaign deactivated.", type: "success" });
        await fetchCampaigns();
      } else {
        setMessage({ text: data.error || "Deactivation failed", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error deactivating campaign", type: "error" });
    }
  }

  // Deduplicate by title so suggestions list never displays duplicates
  const uniqueCampaigns = useMemo(() => {
    const seen = new Set<string>();
    const res: Campaign[] = [];
    for (const c of campaigns) {
      const key = (c.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      res.push(c);
    }
    return res;
  }, [campaigns]);

  const activeCampaigns = uniqueCampaigns.filter((c) => c.status === "active");
  const suggestedCampaigns = uniqueCampaigns.filter((c) => c.status === "suggested");
  const expiredCampaigns = uniqueCampaigns.filter((c) => c.status === "expired");

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand-blue animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
              Autonomous Growth Engine
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Campaign Orchestrator</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generates targeted rule overrides from 7-day transaction volumes & trust scores with a guaranteed 20% safety ceiling.
          </p>
        </div>

        <button
          onClick={runOrchestrator}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-blue/20 transition hover:brightness-110 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          <span>{loading ? "Analyzing 7-Day History..." : "Run Orchestrator"}</span>
        </button>
      </div>

      {/* Message feedback */}
      {message && (
        <div
          className={cn(
            "rounded-xl p-3.5 text-xs font-medium border flex items-center justify-between",
            message.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Safety Ceiling Guarantee Banner */}
      <div className="rounded-2xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/[0.04] via-indigo-500/[0.03] to-transparent p-4 sm:p-5 flex items-start gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue mt-0.5">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-brand-navy uppercase tracking-wide">
              Hard Safety Ceiling Enforced
            </h4>
            <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
              MAX +20% CAP
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            No campaign override can exceed 20% above your merchant base rules. Campaign rules layer directly on top of base rules during evaluation and automatically revert when expired.
          </p>
        </div>
      </div>

      {/* Active Campaign Section */}
      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-success">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Active Live Campaign (influencing firewall)</span>
          </div>

          <div className="grid gap-4">
            {activeCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="overflow-hidden rounded-2xl border-2 border-success/40 bg-card shadow-md shadow-success/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-success/[0.06] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success/20 px-2.5 py-1 text-[10px] font-bold text-success uppercase">
                      Active Now
                    </span>
                    <h3 className="text-sm font-bold text-brand-navy">{camp.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5 text-warning" />
                      Expires: {camp.expiresAt ? new Date(camp.expiresAt).toLocaleString("en-IN") : "In 48 hours"}
                    </span>
                    <button
                      onClick={() => handleDeactivate(camp.id)}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition cursor-pointer"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-sm text-brand-navy leading-relaxed">{camp.suggestion}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {camp.ruleOverride.maxOrderAmount && (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">Max Order Cap</span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-lg font-bold font-mono text-success">
                            ₹{camp.ruleOverride.maxOrderAmount.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground line-through font-mono">
                            ₹{rules.maxOrder.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-blue font-medium">
                          +{Math.round(((camp.ruleOverride.maxOrderAmount - rules.maxOrder) / rules.maxOrder) * 100)}% boost
                        </span>
                      </div>
                    )}

                    {camp.ruleOverride.maxDiscountPercent && (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">Max Discount Cap</span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-lg font-bold font-mono text-success">
                            {camp.ruleOverride.maxDiscountPercent}%
                          </span>
                          <span className="text-xs text-muted-foreground line-through font-mono">
                            {rules.maxDiscount}%
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-blue font-medium">
                          +{camp.ruleOverride.maxDiscountPercent - rules.maxDiscount}% allowance
                        </span>
                      </div>
                    )}

                    {camp.ruleOverride.approvalThreshold && (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">Approval Threshold</span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-lg font-bold font-mono text-success">
                            ₹{camp.ruleOverride.approvalThreshold.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground line-through font-mono">
                            ₹{rules.approvalAbove.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-blue font-medium">Auto-approve range expanded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Campaigns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-navy">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            <span>AI Campaign Suggestions ({suggestedCampaigns.length})</span>
          </div>
        </div>

        {suggestedCampaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand-blue/50" />
            <h4 className="mt-2 text-sm font-semibold text-brand-navy">No suggested campaigns yet</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Click "Run Orchestrator" above to analyze your transactions and generate high-conversion growth campaigns within policy safety ceilings.
            </p>
            <button
              onClick={runOrchestrator}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue hover:text-white transition cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span>Generate Suggestions Now</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-brand-blue/40 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-semibold text-brand-blue">
                      {camp.categoryTarget || "All Categories"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Source: {camp.source}
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-sm font-bold text-brand-navy">{camp.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{camp.suggestion}</p>

                  <div className="mt-4 rounded-xl bg-muted/40 p-3 space-y-1.5 text-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Proposed Override
                    </span>
                    {camp.ruleOverride.maxOrderAmount && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">Max Order Cap:</span>
                        <span className="font-bold text-brand-navy">
                          ₹{camp.ruleOverride.maxOrderAmount.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] text-brand-blue font-normal">(Base: ₹{rules.maxOrder})</span>
                        </span>
                      </div>
                    )}
                    {camp.ruleOverride.maxDiscountPercent && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">Max Discount:</span>
                        <span className="font-bold text-brand-navy">
                          {camp.ruleOverride.maxDiscountPercent}%{" "}
                          <span className="text-[10px] text-brand-blue font-normal">(Base: {rules.maxDiscount}%)</span>
                        </span>
                      </div>
                    )}
                    {camp.ruleOverride.approvalThreshold && (
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">Auto-approve Cap:</span>
                        <span className="font-bold text-brand-navy">
                          ₹{camp.ruleOverride.approvalThreshold.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] text-brand-blue font-normal">(Base: ₹{rules.approvalAbove})</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">Duration: 48 hours</span>
                  <button
                    onClick={() => handleActivate(camp.id)}
                    disabled={activatingId === camp.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
                  >
                    {activatingId === camp.id ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired / Historical Section */}
      {expiredCampaigns.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Past Expired Campaigns ({expiredCampaigns.length})
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {expiredCampaigns.map((camp) => (
              <div key={camp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-brand-navy">{camp.title}</div>
                  <div className="text-muted-foreground text-[11px]">{camp.suggestion}</div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground self-start sm:self-auto">
                  Expired on {camp.expiresAt ? new Date(camp.expiresAt).toLocaleDateString("en-IN") : "Past"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  action,
  actionLabel,
}: {
  icon: typeof Activity;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && (
        <button onClick={action} className="mt-4 text-xs font-semibold text-brand-blue hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface MerchantProfileData {
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  businessCategory: string;
  gstin: string;
  address: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  gatewayMode: "test" | "live";
  autoCapture: boolean;
  webhookSecret: string;
  agentApiKey: string;
  defaultTrustScore: number;
  strictAgentAuth: boolean;
  alertOnEscalation: boolean;
  alertOnSpendCap: boolean;
  alertOnAuditTamper: boolean;
}

const DEFAULT_PROFILE: MerchantProfileData = {
  businessName: "SentryPay Retail & Autonomous Systems",
  contactEmail: "demo@razorpay.com",
  contactPhone: "+91 98765 43210",
  businessCategory: "E-Commerce & Digital Retail",
  gstin: "29AAAAA0000A1Z5",
  address: "Level 4, Embassy TechVillage, Outer Ring Rd, Bellandur, Bengaluru, Karnataka 560103",
  razorpayKeyId: "rzp_test_1DP5mmOlF5G5ag",
  razorpayKeySecret: "s3cr3t_t3st_k3y_98234razorpay",
  gatewayMode: "test",
  autoCapture: true,
  webhookSecret: "whsec_9a8b7c6d5e4f3a2b1c",
  agentApiKey: "sp_live_ag_9f2e7b8a1c4d603e",
  defaultTrustScore: 85,
  strictAgentAuth: true,
  alertOnEscalation: true,
  alertOnSpendCap: true,
  alertOnAuditTamper: true,
};

function MerchantProfilePanel() {
  const { merchantEmail, setMerchantEmail, rules } = useFirewall();
  const [profile, setProfile] = useState<MerchantProfileData>({
    ...DEFAULT_PROFILE,
    contactEmail: merchantEmail || DEFAULT_PROFILE.contactEmail,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from Firestore
  useEffect(() => {
    const profileRef = doc(db, "merchants", "demo_merchant", "profile", "current");
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<MerchantProfileData>;
          setProfile((prev) => ({
            ...prev,
            ...data,
          }));
        }
      },
      (err) => {
        console.warn("Could not load merchant profile from Firestore:", err);
      }
    );
    return () => unsub();
  }, []);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegenerateApiKey = () => {
    const randomHex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const newKey = `sp_live_ag_${randomHex}`;
    setProfile((prev) => ({ ...prev, agentApiKey: newKey }));
  };

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const profileRef = doc(db, "merchants", "demo_merchant", "profile", "current");
      await setDoc(profileRef, {
        ...profile,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update global merchant email in store
      if (profile.contactEmail && profile.contactEmail !== merchantEmail) {
        setMerchantEmail(profile.contactEmail);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to save merchant profile:", err);
      alert("Failed to save profile. Please check console.");
    } finally {
      setIsSaving(false);
    }
  };

  const webhookEndpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/razorpay-webhook`
    : "http://localhost:8080/api/razorpay-webhook";

  const purchaseApiEndpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/purchase`
    : "http://localhost:8080/api/purchase";

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-gradient-to-r from-card via-card to-brand-blue/5 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/15 border border-brand-blue/25 text-xl font-bold text-brand-navy shadow-inner">
            {profile.businessName
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase() || "SP"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{profile.businessName}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" /> Verified Merchant
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Merchant ID: <span className="font-mono font-medium text-foreground">demo_merchant</span> · Razorpay Gateway v2.4 · SentryPay Guard Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setProfile(DEFAULT_PROFILE)}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow transition",
              saveSuccess
                ? "bg-success hover:bg-success/90"
                : "bg-brand-blue hover:bg-brand-blue/90"
            )}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved to Cloud!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs font-medium text-success shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Merchant details, Razorpay credentials, and agent gateway settings have been successfully updated in Firestore!</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-success/70 hover:text-success">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Business Profile & Identity */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-navy">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Business Profile & Contact Information</h3>
              <p className="text-xs text-muted-foreground">General merchant entity details used for invoicing, notifications, and agent interactions</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="e.g. SentryPay Retail Store"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Billing & Contact Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({ ...profile, contactEmail: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="merchant@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Support Phone</label>
              <div className="relative">
                <input
                  type="text"
                  value={profile.contactPhone}
                  onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Category</label>
              <select
                value={profile.businessCategory}
                onChange={(e) => setProfile({ ...profile, businessCategory: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="E-Commerce & Digital Retail">E-Commerce & Digital Retail</option>
                <option value="SaaS & Cloud Services">SaaS & Cloud Services</option>
                <option value="Electronics & Hardware">Electronics & Hardware</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Groceries & Essentials">Groceries & Essentials</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">GSTIN / Tax ID</label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                placeholder="29AAAAA0000A1Z5"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Registered Office Address</label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                placeholder="Office or warehouse location..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Razorpay Gateway Credentials & Settlement */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-navy">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Razorpay Gateway Integration</h3>
                <p className="text-xs text-muted-foreground">Configure your Razorpay Standard / Orders API keys, auto-capture rules, and webhook secrets</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setProfile({ ...profile, gatewayMode: "test" })}
                className={cn(
                  "rounded-md px-3 py-1 font-semibold transition",
                  profile.gatewayMode === "test"
                    ? "bg-warning text-brand-navy shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sandbox / Test
              </button>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, gatewayMode: "live" })}
                className={cn(
                  "rounded-md px-3 py-1 font-semibold transition",
                  profile.gatewayMode === "live"
                    ? "bg-success text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Live Production
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Razorpay Key ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.razorpayKeyId}
                  onChange={(e) => setProfile({ ...profile, razorpayKeyId: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="rzp_test_..."
                />
                <button
                  type="button"
                  onClick={() => handleCopy(profile.razorpayKeyId, "keyId")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy Key ID"
                >
                  {copiedField === "keyId" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Razorpay Key Secret</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={profile.razorpayKeySecret}
                    onChange={(e) => setProfile({ ...profile, razorpayKeySecret: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-xs font-mono text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    placeholder="s3cr3t_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(profile.razorpayKeySecret, "secret")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy Secret"
                >
                  {copiedField === "secret" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Webhook Endpoint URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookEndpoint}
                  className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(webhookEndpoint, "webhook")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy Webhook Endpoint"
                >
                  {copiedField === "webhook" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Webhook Secret (HMAC-SHA256)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.webhookSecret}
                  onChange={(e) => setProfile({ ...profile, webhookSecret: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(profile.webhookSecret, "webhookSecret")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy Webhook Secret"
                >
                  {copiedField === "webhookSecret" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profile.autoCapture}
                  onChange={(e) => setProfile({ ...profile, autoCapture: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-brand-blue focus:ring-brand-blue"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Automatic Payment Capture</span>
                  <p className="text-[11px] text-muted-foreground">
                    Immediately capture funds on approved agent purchase orders without manual authorization settlement.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: AI Agent Gateway & Policy API */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-navy">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Agent Gateway & Autonomous Buyer Settings</h3>
              <p className="text-xs text-muted-foreground">Endpoint controls, agent authorization keys, and initial trust thresholds for AI buyers</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Agent Purchase API Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={purchaseApiEndpoint}
                  className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(purchaseApiEndpoint, "apiEndpoint")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy Endpoint"
                >
                  {copiedField === "apiEndpoint" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Merchant Agent API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.agentApiKey}
                  readOnly
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(profile.agentApiKey, "agentKey")}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Copy API Key"
                >
                  {copiedField === "agentKey" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateApiKey}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  title="Regenerate Key"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Default Agent Trust Score</label>
                <span className="text-xs font-semibold text-brand-navy">{profile.defaultTrustScore} / 100</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={profile.defaultTrustScore}
                onChange={(e) => setProfile({ ...profile, defaultTrustScore: Number(e.target.value) })}
                className="w-full accent-brand-blue cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>50 (Cautious / Frequent Escalation)</span>
                <span>85 (Recommended)</span>
                <span>100 (Unrestricted)</span>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profile.strictAgentAuth}
                  onChange={(e) => setProfile({ ...profile, strictAgentAuth: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-brand-blue focus:ring-brand-blue"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground">Strict Signature Verification</span>
                  <p className="text-[11px] text-muted-foreground">
                    Enforce X-SentryPay-Signature on all incoming automated purchasing payload deliveries.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Automated Alerts & Notifications */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-navy">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notifications & Security Alerts</h3>
              <p className="text-xs text-muted-foreground">Choose when you want live notifications or merchant dashboard alerts triggered</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-border hover:bg-muted/30 transition">
              <input
                type="checkbox"
                checked={profile.alertOnEscalation}
                onChange={(e) => setProfile({ ...profile, alertOnEscalation: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-blue focus:ring-brand-blue"
              />
              <div>
                <span className="text-xs font-semibold text-foreground">Pending Approval Escalation Alerts</span>
                <p className="text-[11px] text-muted-foreground">
                  Receive instant notifications when an AI agent purchase exceeds rules and enters the Approval Queue.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-border hover:bg-muted/30 transition">
              <input
                type="checkbox"
                checked={profile.alertOnSpendCap}
                onChange={(e) => setProfile({ ...profile, alertOnSpendCap: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-blue focus:ring-brand-blue"
              />
              <div>
                <span className="text-xs font-semibold text-foreground">80% Daily Spend Budget Warning</span>
                <p className="text-[11px] text-muted-foreground">
                  Send a priority alert when total approved agent purchases today approach the daily limit (Current cap: ₹{rules.dailyLimit.toLocaleString("en-IN")}).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-border hover:bg-muted/30 transition">
              <input
                type="checkbox"
                checked={profile.alertOnAuditTamper}
                onChange={(e) => setProfile({ ...profile, alertOnAuditTamper: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand-blue focus:ring-brand-blue"
              />
              <div>
                <span className="text-xs font-semibold text-foreground">Verdict Chain Cryptographic Tamper Warning</span>
                <p className="text-[11px] text-muted-foreground">
                  Immediately flag any transaction block whose SHA-256 hash does not match previous link integrity.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-brand-blue px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-brand-blue/90 transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile & Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
