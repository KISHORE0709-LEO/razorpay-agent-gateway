import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrustTier, AgentTrustProfile } from "@/lib/types";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface AgentTrustBadgeProps {
  agentId: string;
  initialScore?: number;
  initialTier?: TrustTier;
  showScore?: boolean;
  className?: string;
  compact?: boolean;
}

export function AgentTrustBadge({
  agentId,
  initialScore,
  initialTier,
  showScore = true,
  className = "",
  compact = false,
}: AgentTrustBadgeProps) {
  const [trust, setTrust] = useState<{ score: number; tier: TrustTier }>({
    score: initialScore ?? 50,
    tier:
      initialTier ??
      (initialScore !== undefined
        ? initialScore >= 80
          ? "Trusted"
          : initialScore < 30
          ? "Flagged"
          : "Neutral"
        : "Neutral"),
  });

  useEffect(() => {
    if (!agentId) return;

    const unsubscribe = onSnapshot(
      doc(db, "merchants/demo_merchant/agentTrust", agentId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AgentTrustProfile;
          const score = typeof data.score === "number" ? data.score : 50;
          let tier: TrustTier = "Neutral";
          if (score >= 80) tier = "Trusted";
          else if (score < 30) tier = "Flagged";

          setTrust({ score, tier });
        } else {
          // Default starting profile if not yet written to Firestore
          const score = initialScore ?? 50;
          let tier: TrustTier = "Neutral";
          if (score >= 80) tier = "Trusted";
          else if (score < 30) tier = "Flagged";
          setTrust({ score, tier });
        }
      },
      (err) => {
        console.warn("Error listening to agent trust:", err);
      }
    );

    return () => unsubscribe();
  }, [agentId, initialScore]);

  const { score, tier } = trust;

  // Visual styles:
  // Trusted (green)
  // Neutral (gray)
  // Flagged (amber)
  const styles = {
    Trusted: {
      badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
      dot: "bg-emerald-500 ring-emerald-500/30",
      Icon: ShieldCheck,
      label: "Trusted",
    },
    Neutral: {
      badge: "bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400",
      dot: "bg-slate-400 ring-slate-400/30",
      Icon: Shield,
      label: "Neutral",
    },
    Flagged: {
      badge: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400",
      dot: "bg-amber-500 ring-amber-500/30",
      Icon: ShieldAlert,
      label: "Flagged",
    },
  }[tier];

  const Icon = styles.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${styles.badge} ${className}`}
      title={`Agent Trust Score: ${score}/100 (${styles.label})`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {!compact && <span>{styles.label}</span>}
      {showScore && (
        <span className="font-mono text-[10px] font-semibold opacity-90">
          {score}
        </span>
      )}
    </span>
  );
}
