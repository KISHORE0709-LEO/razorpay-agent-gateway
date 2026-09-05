import {
  ShieldCheck,
  GitFork,
  RotateCcw,
  Clock3,
  Link2,
  TrendingUp,
  CreditCard,
  Layers,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

interface FeatureCard {
  icon: any;
  title: string;
  badge: string;
  description: string;
  benefits: string[];
  color: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: GitFork,
    title: "4-Way Policy Firewall",
    badge: "Core Engine",
    color: "text-brand-blue border-brand-blue/30 bg-brand-blue/10",
    description:
      "Evaluates every incoming AI agent purchase request in under 50ms, dynamically routing into Approve, Recover, Escalate, or Block outcomes.",
    benefits: [
      "Sub-50ms rule evaluation against live merchant policies",
      "Cumulative daily velocity ceiling checks across all agents",
      "Instant block response with clear, audit-ready justification",
    ],
  },
  {
    icon: RotateCcw,
    title: "Intelligent Catalog Recovery",
    badge: "Revenue Defense",
    color: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    description:
      "Instead of losing sales when an AI buyer exceeds price limits, SentryPay searches the live catalog to recommend nearest in-budget alternatives in the same category.",
    benefits: [
      "Converts over-budget blocks into closed sales",
      "Preserves customer/agent purchase intent automatically",
      "Respects maximum discount and budget threshold constraints",
    ],
  },
  {
    icon: Clock3,
    title: "Human-in-the-Loop Approval Queue",
    badge: "0ms Oversight",
    color: "text-brand-blue border-brand-blue/30 bg-brand-blue/10",
    description:
      "Borderline and high-value orders pause safely in a real-time merchant queue with agent trust metrics and 1-tap Approve/Deny actions.",
    benefits: [
      "Zero-latency optimistic UI with automatic error rollback",
      "Agent reputation and trust score displayed upfront",
      "Approved requests trigger immediate background payment execution",
    ],
  },
  {
    icon: Link2,
    title: "SHA-256 Cryptographic Verdict Chain",
    badge: "Audit Ledger",
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    description:
      "Every single policy verdict, recovery alternative, and human sign-off is permanently sealed in an immutable, parent-linked cryptographic hash chain.",
    benefits: [
      "SHA-256 block hashing chained back to genesis block 000000...",
      "1-click 'Verify Chain' verifies total ledger integrity in real time",
      "Serialized atomic queue prevents race conditions and chain forks",
    ],
  },
  {
    icon: SlidersHorizontal,
    title: "Dynamic Catalog & Category Governance",
    badge: "Inventory Sync",
    color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
    description:
      "Categories are dynamically generated from current catalog inventory. Brand-new categories default to blocked until explicitly enabled by the merchant.",
    benefits: [
      "Zero unmonitored product lines or orphan categories",
      "Built-in Policy Advisor computes safe baseline rules from catalog medians",
      "Live catalog stat cards calculate live stock, prices, and totals",
    ],
  },
  {
    icon: TrendingUp,
    title: "Autonomous AI Agent Trust Scoring",
    badge: "Reputation Engine",
    color: "text-violet-400 border-violet-400/30 bg-violet-400/10",
    description:
      "Every buyer agent builds an adaptive 0–100 trust score based on purchase history, block frequency, and compliance, scaling scrutiny without moving hard limits.",
    benefits: [
      "Dynamic tiers: Flagged, Low, Neutral, Trusted, and Verified",
      "Suspicious agents trigger higher human review thresholds",
      "Merchant's hard safety limits are never compromised",
    ],
  },
  {
    icon: Sparkles,
    title: "Safe Campaign Orchestrator",
    badge: "Governed Growth",
    color: "text-pink-400 border-pink-400/30 bg-pink-400/10",
    description:
      "Autonomous campaign generator suggests seasonal or promotional spend limit overrides with a hard 20% safety ceiling that auto-expire.",
    benefits: [
      "Time-boxed expiration prevents permanent spend inflation",
      "Strict isolation: Never mutates base merchant rules",
      "Full attribution in the cryptographic ledger for auditability",
    ],
  },
  {
    icon: CreditCard,
    title: "Protected Razorpay Settlement Rails",
    badge: "Processor Isolation",
    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    description:
      "AI buyer agents never touch payment processor keys or raw credentials. Real test-mode Razorpay Orders are generated exclusively on trusted server rails.",
    benefits: [
      "Isolated server-to-server Razorpay Orders API generation",
      "Unique order IDs permanently bound to transaction audit logs",
      "Zero risk of autonomous credential leakage or unauthorized charges",
    ],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 w-full py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3.5 py-1 text-xs font-semibold text-brand-blue shadow-xs">
          <Layers className="h-3.5 w-3.5" />
          <span>Core Capabilities</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
          Enterprise Governance for Autonomous Commerce
        </h2>

        <p className="text-xs sm:text-sm text-white/70 max-w-2xl mx-auto leading-relaxed">
          Everything merchants need to safely welcome AI buyer agents, protect profit margins, enforce spend limits, and guarantee audit compliance.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <div
              key={i}
              className="group rounded-2xl border border-white/10 bg-[#071D3A]/80 p-5 backdrop-blur-sm transition-all duration-200 hover:border-brand-blue/40 hover:bg-[#071D3A] hover:shadow-[0_8px_24px_rgba(13,148,251,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${feature.color} shadow-xs`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/60">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-white group-hover:text-brand-blue transition-colors">
                  {feature.title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-white/65">
                  {feature.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <ul className="space-y-1.5">
                  {feature.benefits.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-1.5 text-[11px] text-white/60">
                      <span className="h-1 w-1 rounded-full bg-brand-blue shrink-0 mt-1.5" />
                      <span className="leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
