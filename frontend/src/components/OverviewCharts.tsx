import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { AuditEntry, Rules } from "@/lib/types";
import { isToday } from "@shared/api";
import { Activity, TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react";

interface OverviewChartsProps {
  auditLog: AuditEntry[];
  primaryTodayLog: AuditEntry[];
  rules: Rules;
  dailySpent: number;
}

export function OverviewCharts({ auditLog, primaryTodayLog, rules, dailySpent }: OverviewChartsProps) {
  const currentHour = new Date().getHours();

  // 1. Data for "Decision activity today" (grouped by hour)
  // Pulls directly from primaryTodayLog to ensure 100% parity with "Requests today" KPI
  const decisionActivityData = useMemo(() => {
    // 24 hours of today: 00:00 to 23:00
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hourStr = String(i).padStart(2, "0") + ":00";
      return {
        hour: hourStr,
        hourNum: i,
        approved: 0,
        enhanced: 0,
        recovered: 0,
        escalated: 0,
        blocked: 0,
        other: 0,
        total: 0,
      };
    });

    for (const entry of primaryTodayLog) {
      const timeVal = entry.time || entry.timestamp;
      const d = new Date(timeVal || 0);
      if (isNaN(d.getTime())) continue;

      const h = d.getHours();
      if (h < 0 || h > 23) continue;

      if (entry.decision === "approved") {
        hours[h].approved += 1;
      } else if (entry.decision === "enhanced") {
        hours[h].enhanced += 1;
      } else if (entry.decision === "recovered") {
        hours[h].recovered += 1;
      } else if (entry.decision === "escalated") {
        hours[h].escalated += 1;
      } else if (entry.decision === "blocked") {
        hours[h].blocked += 1;
      } else {
        hours[h].other += 1;
      }
      hours[h].total += 1;
    }

    return hours;
  }, [primaryTodayLog]);

  // 2. Data for "Daily spend vs limit" (cumulative approved spend across today)
  const spendVsLimitData = useMemo(() => {
    // Collect all approved events today with their timestamp and amount
    const approvedEvents: Array<{ time: number; hour: number; amount: number }> = [];

    for (const entry of auditLog) {
      const timeVal = entry.time || entry.timestamp;
      if (!isToday(timeVal)) continue;

      const d = new Date(timeVal!);
      if (isNaN(d.getTime())) continue;

      const amt = Number(entry.amount ?? entry.requestedAmount ?? 0);

      if (entry.type === "outcome_update") {
        if (entry.outcome === "approved") {
          approvedEvents.push({
            time: d.getTime(),
            hour: d.getHours(),
            amount: amt,
          });
        }
      } else {
        if (
          (entry.decision === "approved" || entry.status === "completed") &&
          entry.status !== "failed"
        ) {
          approvedEvents.push({
            time: d.getTime(),
            hour: d.getHours(),
            amount: amt,
          });
        }
      }
    }

    // Sort chronologically
    approvedEvents.sort((a, b) => a.time - b.time);

    // Build cumulative spend for each hour up to 23
    const data: Array<{ hour: string; hourNum: number; spend: number | null }> = [];
    let runningTotal = 0;

    for (let h = 0; h <= 23; h++) {
      const hourStr = String(h).padStart(2, "0") + ":00";

      // Add all transactions that occurred up to this hour
      const currentHourEvents = approvedEvents.filter((e) => e.hour === h);
      for (const e of currentHourEvents) {
        runningTotal += e.amount;
      }

      // Plot up to the current hour; future hours remain null so line stops at now
      if (h <= currentHour) {
        data.push({
          hour: hourStr,
          hourNum: h,
          spend: runningTotal,
        });
      } else {
        data.push({
          hour: hourStr,
          hourNum: h,
          spend: null,
        });
      }
    }

    return data;
  }, [auditLog, currentHour]);

  // Calculations for summary indicators
  const maxSpend = useMemo(() => {
    return Math.max(dailySpent, rules.dailyLimit);
  }, [dailySpent, rules.dailyLimit]);

  const spendPercentage = rules.dailyLimit > 0 ? (dailySpent / rules.dailyLimit) * 100 : 0;
  const isLimitReached = dailySpent >= rules.dailyLimit && rules.dailyLimit > 0;

  const totalDecisionsToday = primaryTodayLog.length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Chart 1: Decision Activity Today */}
      <section className="rounded-2xl border border-brand-blue/20 bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-navy text-sm sm:text-base">Decision activity today</h3>
                <p className="text-xs text-muted-foreground">Hourly distribution of firewall evaluations</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              <span>{totalDecisionsToday} events</span>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={decisionActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={3}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                />
                <Tooltip content={<CustomDecisionTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
                <Bar dataKey="approved" name="Approved" stackId="a" fill="#10b981" />
                <Bar dataKey="enhanced" name="Enhanced" stackId="a" fill="#6366f1" />
                <Bar dataKey="recovered" name="Recovered" stackId="a" fill="#0d63f8" />
                <Bar dataKey="escalated" name="Escalated" stackId="a" fill="#f59e0b" />
                <Bar dataKey="blocked" name="Blocked" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Green: Auto-Approved
            </span>
            <span className="inline-flex items-center gap-1 text-[#6366f1]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
              Purple: Enhanced
            </span>
            <span className="inline-flex items-center gap-1 text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Red: Blocked
            </span>
          </div>
          <span className="font-mono text-[10px]">Client-side grouped</span>
        </div>
      </section>

      {/* Chart 2: Daily Spend vs Limit */}
      <section className="rounded-2xl border border-brand-blue/20 bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-navy text-sm sm:text-base">Daily spend vs limit</h3>
                <p className="text-xs text-muted-foreground">Running cumulative approved spend vs policy limit</p>
              </div>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-medium ${
                isLimitReached
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : spendPercentage > 75
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-success/30 bg-success/10 text-success"
              }`}
            >
              {isLimitReached ? (
                <>
                  <ShieldAlert className="h-3 w-3" />
                  <span>Limit Hit (₹{dailySpent.toLocaleString("en-IN")})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{spendPercentage.toFixed(1)}% of cap</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendVsLimitData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d63f8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d63f8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={3}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  domain={[0, Math.ceil(maxSpend * 1.15)]}
                />
                <Tooltip content={<CustomSpendTooltip limit={rules.dailyLimit} />} />
                <ReferenceLine
                  y={rules.dailyLimit}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Cap: ₹${rules.dailyLimit.toLocaleString("en-IN")}`,
                    position: "insideTopRight",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Cumulative Approved Spend"
                  stroke="#0d63f8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                  connectNulls={false}
                  dot={{ r: 2.5, fill: "#0d63f8", strokeWidth: 1, stroke: "#ffffff" }}
                  activeDot={{ r: 5, fill: "#0d63f8", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground font-mono">
          <span>Current Spend: ₹{dailySpent.toLocaleString("en-IN")}</span>
          <span className={isLimitReached ? "text-destructive font-semibold" : ""}>
            {isLimitReached
              ? "Flattened at cap — subsequent requests blocked"
              : `Remaining: ₹${Math.max(0, rules.dailyLimit - dailySpent).toLocaleString("en-IN")}`}
          </span>
        </div>
      </section>
    </div>
  );
}

// Custom Tooltip for Decision Activity Bar Chart
function CustomDecisionTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-brand-navy p-3 text-white shadow-xl backdrop-blur-md text-xs">
      <div className="font-semibold text-white/90 border-b border-white/10 pb-1.5 mb-2 flex items-center justify-between gap-4">
        <span>Time: {label}</span>
        <span className="font-mono text-[10px] text-white/60">{data.total} total</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4 text-[#10b981]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            Approved
          </span>
          <span className="font-mono font-semibold">{data.approved}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#6366f1]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
            Enhanced
          </span>
          <span className="font-mono font-semibold">{data.enhanced}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#0d63f8]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0d63f8]" />
            Recovered
          </span>
          <span className="font-mono font-semibold">{data.recovered}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#f59e0b]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            Escalated
          </span>
          <span className="font-mono font-semibold">{data.escalated}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#ef4444]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            Blocked
          </span>
          <span className="font-mono font-semibold">{data.blocked}</span>
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip for Daily Spend Area Chart
function CustomSpendTooltip({ active, payload, label, limit }: any) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0]?.value;
  if (value === null || value === undefined) return null;

  const pct = limit > 0 ? (value / limit) * 100 : 0;
  const isCapHit = value >= limit && limit > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-brand-navy p-3 text-white shadow-xl backdrop-blur-md text-xs">
      <div className="font-semibold text-white/90 border-b border-white/10 pb-1.5 mb-2">
        Hour: {label}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/70">Cumulative Spend:</span>
          <span className="font-mono font-bold text-white">₹{Number(value).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/70">Daily Limit:</span>
          <span className="font-mono text-white/90">₹{Number(limit).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
          <span className="text-white/70">Limit Utilized:</span>
          <span className={`font-mono font-semibold ${isCapHit ? "text-destructive" : pct > 75 ? "text-warning" : "text-success"}`}>
            {pct.toFixed(1)}% {isCapHit ? "(Cap Reached)" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
