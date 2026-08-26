import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Clock3,
  Ban,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OUTCOMES = [
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle2,
    color: "text-success",
    ring: "ring-success/50",
    bg: "bg-success/10",
    glow: "shadow-[0_0_28px_rgba(18,183,106,0.35)]",
  },
  {
    key: "recovered",
    label: "Recovered",
    icon: RefreshCw,
    color: "text-brand-blue",
    ring: "ring-brand-blue/50",
    bg: "bg-brand-blue/10",
    glow: "shadow-[0_0_28px_rgba(13,148,251,0.35)]",
  },
  {
    key: "escalated",
    label: "Escalated",
    icon: Clock3,
    color: "text-warning",
    ring: "ring-warning/50",
    bg: "bg-warning/10",
    glow: "shadow-[0_0_28px_rgba(247,144,9,0.35)]",
  },
  {
    key: "blocked",
    label: "Blocked",
    icon: Ban,
    color: "text-destructive",
    ring: "ring-destructive/50",
    bg: "bg-destructive/10",
    glow: "shadow-[0_0_28px_rgba(240,68,56,0.35)]",
  },
] as const;

export function FirewallFlowAnimation() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycle((c) => (c + 1) % OUTCOMES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const activeOutcome = OUTCOMES[cycle];

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-2">
        {/* AI Agent */}
        <FlowNode
          icon={Bot}
          label="AI Agent"
          sublabel="sends purchase request"
          tone="neutral"
        />

        <Connector />

        {/* Firewall */}
        <motion.div
          animate={{ boxShadow: [
            "0 0 0px rgba(13,148,251,0.0)",
            "0 0 32px rgba(13,148,251,0.45)",
            "0 0 0px rgba(13,148,251,0.0)",
          ] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-3 rounded-2xl border border-brand-blue/40 bg-white/5 px-6 py-4 backdrop-blur-sm"
        >
          <ShieldCheck className="h-6 w-6 text-brand-blue" />
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Firewall</div>
            <div className="text-xs text-white/50">
              checking rules, caps &amp; category&hellip;
            </div>
          </div>
        </motion.div>

        <Connector />

        {/* Branches */}
        <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
          {OUTCOMES.map((outcome, i) => {
            const active = cycle === i;
            const Icon = outcome.icon;
            return (
              <motion.div
                key={outcome.key}
                animate={{
                  scale: active ? 1.06 : 1,
                  opacity: active ? 1 : 0.45,
                }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border border-white/10 px-2 py-3 text-center transition-colors",
                  active ? outcome.bg : "bg-white/[0.03]",
                  active && outcome.glow,
                )}
              >
                <Icon className={cn("h-5 w-5", outcome.color)} />
                <span className="text-[11px] font-medium text-white/80">
                  {outcome.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        <Connector active={activeOutcome.key === "approved"} />

        {/* Razorpay */}
        <motion.div
          animate={{
            opacity: activeOutcome.key === "approved" ? 1 : 0.4,
            scale: activeOutcome.key === "approved" ? 1.04 : 1,
          }}
          transition={{ duration: 0.4 }}
          className={cn(
            "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5",
            activeOutcome.key === "approved" &&
              "shadow-[0_0_28px_rgba(13,148,251,0.4)] border-brand-blue/50",
          )}
        >
          <Zap className="h-4 w-4 text-brand-blue" />
          <span className="text-sm font-semibold text-white">Razorpay</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
            Test Mode
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: typeof Bot;
  label: string;
  sublabel: string;
  tone?: "neutral";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
      <Icon className="h-6 w-6 text-white/80" />
      <div className="text-left">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-white/50">{sublabel}</div>
      </div>
    </div>
  );
}

function Connector({ active = true }: { active?: boolean }) {
  return (
    <div className="relative h-8 w-px overflow-hidden bg-white/10">
      {active && (
        <>
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-brand-blue animate-flow-down"
            style={{ animationDelay: "0s" }}
          />
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-brand-blue animate-flow-down"
            style={{ animationDelay: "0.55s" }}
          />
        </>
      )}
    </div>
  );
}
