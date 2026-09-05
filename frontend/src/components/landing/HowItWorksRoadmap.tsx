import {
  SlidersHorizontal,
  GitFork,
  Clock3,
  CreditCard,
  Link2,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  Ban,
  Bot,
  ChevronDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepItem {
  id: string;
  stepNum: string;
  icon: any;
  title: string;
  badge: string;
  description: string;
  details: string[];
  visualType?: "outcomes";
  tags: string[];
  alignment: "left" | "right" | "center";
}

const ROADMAP_STEPS: StepItem[] = [
  {
    id: "step-1",
    stepNum: "01",
    icon: Bot,
    title: "AI Buyer Dispatches Purchase Intent",
    badge: "Autonomous Agent Ingestion",
    description:
      "An autonomous AI agent identifies a purchase requirement, presenting its verified cryptographic agent identity (e.g. agt_live_7f3c9e). No payment can reach Razorpay without passing through SentryPay first.",
    details: [
      "Interoperable with AP2 signed mandates & delegated UPI spend frameworks",
      "Authenticates agent identity, budget cap, and target product in real time",
    ],
    tags: ["Agent ID Verification", "AP2 Mandates", "Delegated UPI Spend"],
    alignment: "left",
  },
  {
    id: "step-2",
    stepNum: "02",
    icon: SlidersHorizontal,
    title: "Firewall Evaluates Merchant Policy",
    badge: "Catalog & Rule Cross-Check",
    description:
      "SentryPay checks the request against the merchant's rules: per-order caps, daily spend velocity, approval thresholds, and allowed categories synced directly from the merchant's live catalog.",
    details: [
      "Live catalog sync ensures new/unknown categories are blocked by default",
      "Real-time velocity pool tracks running daily spend across all agents",
    ],
    tags: ["Dynamic Catalog Sync", "Velocity Limits", "Category Allow-Lists"],
    alignment: "right",
  },
  {
    id: "step-3",
    stepNum: "03",
    icon: GitFork,
    title: "The 4-Way Governed Decision Engine",
    badge: "Deterministic Decision Routing",
    description:
      "Rather than a rigid yes/no, SentryPay dynamically branches each request into one of four governed outcomes to protect the merchant while maximizing sales.",
    visualType: "outcomes",
    details: [
      "Instant checkout for low-risk orders; smart alternative offers for over-budget items",
      "Human review for borderline amounts; hard blocks with logged reasons for policy breaches",
    ],
    tags: ["Approve", "Recover (Revenue Defense)", "Escalate", "Block"],
    alignment: "left",
  },
  {
    id: "step-4",
    stepNum: "04",
    icon: Clock3,
    title: "Human-in-the-Loop Approval Queue",
    badge: "Real-Time Merchant Oversight",
    description:
      "High-value requests land immediately in the merchant's live queue. The merchant inspects agent identity, trust score, and pricing with instant 0ms optimistic 1-tap Approve or Deny.",
    details: [
      "Zero-latency optimistic UI updates with automatic error rollback",
      "Live trust badges provide instant behavioral risk context for the merchant",
    ],
    tags: ["0ms Optimistic UI", "Agent Trust Score", "1-Tap Human Decision"],
    alignment: "right",
  },
  {
    id: "step-5",
    stepNum: "05",
    icon: CreditCard,
    title: "Protected Payment Execution via Razorpay",
    badge: "Isolated Payment Rails",
    description:
      "Only approved transactions ever reach Razorpay. AI agents never touch API keys, secrets, or payment credentials. Verified server-side orders are generated safely.",
    details: [
      "Direct server-to-server Razorpay Orders API call (order_... with precise paise)",
      "Strict processor isolation prevents agents from ever intercepting secret keys",
    ],
    tags: ["Razorpay Orders API", "Zero Credential Exposure", "Server-Side Isolation"],
    alignment: "left",
  },
  {
    id: "step-6",
    stepNum: "06",
    icon: Link2,
    title: "Verdict Chain Cryptographic Ledger",
    badge: "SHA-256 Tamper-Evident Ledger",
    description:
      "Every decision and merchant action is cryptographically sealed and hash-chained to the previous block using SHA-256. A 1-click audit confirms 100% chain integrity back to genesis.",
    details: [
      "Serialized atomic queue prevents forks during concurrent transactions",
      "Interactive 1-click audit recalculates all hashes from genesis block 000000...",
    ],
    tags: ["SHA-256 Chained Blocks", "1-Click Chain Audit", "Tamper-Evident Ledger"],
    alignment: "right",
  },
  {
    id: "step-7",
    stepNum: "07",
    icon: TrendingUp,
    title: "Autonomous Trust Scores & Safe Growth Campaigns",
    badge: "Reputation & Governed Growth",
    description:
      "Agents earn evolving trust scores based on payment track records. Concurrently, the Growth Engine suggests temporary, 20%-capped rule boosts that auto-expire and never mutate base rules.",
    details: [
      "Behavioral trust levels (Flagged to Verified) adjust scrutiny safely",
      "Promotional campaigns auto-cap at +20% and auto-expire cleanly",
    ],
    tags: ["Adaptive Scrutiny", "20% Safety Ceiling", "Auto-Expiring Campaigns"],
    alignment: "center",
  },
];

export function HowItWorksRoadmap() {
  return (
    <section id="how-it-works-journey" className="relative z-10 w-full pt-10 pb-16">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3.5 py-1 text-xs font-semibold text-brand-blue shadow-xs">
          <Layers className="h-3.5 w-3.5" />
          <span>Execution Pipeline</span>
        </div>

        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
          How SentryPay Works
        </h2>

        <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
          The end-to-end journey from an AI agent's purchase intent to real-time policy evaluation, human review, Razorpay settlement, and cryptographic logging.
        </p>
      </div>

      {/* S-Curve Pathway Layout (Compact, Optimal Alternating Cards) */}
      <div className="relative mt-10 max-w-3xl mx-auto px-4 sm:px-6">
        {ROADMAP_STEPS.map((step, idx) => {
          const isLeft = step.alignment === "left";
          const isRight = step.alignment === "right";
          const isCenter = step.alignment === "center";
          const isLast = idx === ROADMAP_STEPS.length - 1;
          const nextStep = ROADMAP_STEPS[idx + 1];

          const Icon = step.icon;

          return (
            <div key={step.id} id={step.id} className="relative">
              {/* Compact Card Container */}
              <div
                className={cn(
                  "w-full transition-all duration-200",
                  isLeft && "md:mr-auto md:w-[84%]",
                  isRight && "md:ml-auto md:w-[84%]",
                  isCenter && "mx-auto md:w-[90%]"
                )}
              >
                <div className="rounded-2xl p-4 sm:p-5 transition-all duration-200 relative border border-brand-blue/30 bg-[#071D3A]/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:border-brand-blue/60 hover:shadow-[0_0_20px_rgba(13,148,251,0.2)]">
                  {/* Top Row: Icon Badge (Left) & Badge + Step Number (Right) */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-brand-blue/50 bg-brand-blue/15 text-brand-blue shadow-xs">
                        <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                      </div>
                      <span className="text-[11px] font-medium text-white/60">
                        {step.badge}
                      </span>
                    </div>

                    <span className="rounded-full bg-[#001733] border border-white/15 px-2.5 py-0.5 text-[11px] font-mono font-bold text-brand-blue">
                      {step.stepNum}
                    </span>
                  </div>

                  {/* Headline Title */}
                  <h3 className="mt-3 text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
                    {step.title}
                  </h3>

                  {/* Description Paragraph */}
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/70">
                    {step.description}
                  </p>

                  {/* Step 3 Special Visual: Compact 4 Decision Outcomes */}
                  {step.visualType === "outcomes" && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg border border-success/30 bg-success/10 text-success flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                        <span className="text-[11px] font-bold text-success truncate">Approve</span>
                      </div>

                      <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-[11px] font-bold text-amber-400 truncate">Recover</span>
                      </div>

                      <div className="p-2 rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-brand-blue flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
                        <span className="text-[11px] font-bold text-brand-blue truncate">Escalate</span>
                      </div>

                      <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span className="text-[11px] font-bold text-destructive truncate">Block</span>
                      </div>
                    </div>
                  )}

                  {/* Details row */}
                  <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                    {step.details.map((detail, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-blue shrink-0 mt-1.5" />
                        <span className="text-white/65 leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md px-2 py-0.5 text-[10px] font-mono border border-brand-blue/20 bg-brand-blue/5 text-brand-blue/90"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact S-Curve Connector between Steps */}
              {!isLast && nextStep && (
                <div className="w-full py-2 flex items-center justify-center relative">
                  {/* Desktop S-Curve SVG Pathway */}
                  <div className="hidden md:block w-full h-12 lg:h-14 relative">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 1000 60"
                      preserveAspectRatio="none"
                      fill="none"
                    >
                      <defs>
                        <marker
                          id={`arrow-head-opt-${step.stepNum}`}
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="5"
                          markerHeight="5"
                          orient="auto"
                        >
                          <path d="M 0 1 L 9 5 L 0 9 z" fill="#0D94FB" />
                        </marker>
                      </defs>

                      {/* Transition Left to Right */}
                      {isLeft && nextStep.alignment === "right" && (
                        <path
                          d="M 300 0 C 300 32, 700 28, 700 56"
                          stroke="#0D94FB"
                          strokeWidth="2.5"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-opt-${step.stepNum})`}
                        />
                      )}

                      {/* Transition Right to Left */}
                      {isRight && nextStep.alignment === "left" && (
                        <path
                          d="M 700 0 C 700 32, 300 28, 300 56"
                          stroke="#0D94FB"
                          strokeWidth="2.5"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-opt-${step.stepNum})`}
                        />
                      )}

                      {/* Transition Right to Center */}
                      {isRight && nextStep.alignment === "center" && (
                        <path
                          d="M 700 0 C 700 32, 500 28, 500 56"
                          stroke="#0D94FB"
                          strokeWidth="2.5"
                          strokeDasharray="6 6"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-opt-${step.stepNum})`}
                        />
                      )}
                    </svg>
                  </div>

                  {/* Mobile Connector */}
                  <div className="md:hidden flex flex-col items-center justify-center my-1">
                    <div className="w-0 h-6 border-l-2 border-dashed border-brand-blue" />
                    <ChevronDown className="h-4 w-4 -mt-1 text-brand-blue" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
