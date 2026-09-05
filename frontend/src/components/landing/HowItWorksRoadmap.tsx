import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  GitFork,
  Clock3,
  CreditCard,
  Link2,
  TrendingUp,
  CheckCircle2,
  RotateCcw,
  Ban,
  Sparkles,
  Bot,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepItem {
  id: string;
  stepNum: string;
  icon: any;
  title: string;
  badge: string;
  pitchTime: string;
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
    pitchTime: "0:00 – 0:25 The Hook",
    description:
      "An autonomous AI agent shops on someone's behalf. It parses user intent, target product, and budget, presenting its verified cryptographic agent identity (e.g. agt_live_7f3c9e). No payment can reach Razorpay without first passing through SentryPay.",
    details: [
      "Interoperable with Google AP2 signed mandates and NPCI delegated UPI spend frameworks",
      "Authenticates agent identity and session before evaluating payment parameters",
      "Extracts target product, price ceiling, and category specifications in real time",
    ],
    tags: ["Agent ID: agt_live_7f3c9e", "AP2 Mandates", "Delegated UPI Spend"],
    alignment: "left",
  },
  {
    id: "step-2",
    stepNum: "02",
    icon: SlidersHorizontal,
    title: "Firewall Evaluates Merchant Policy",
    badge: "Catalog & Rule Cross-Check",
    pitchTime: "0:50 – 1:35 Policy & Catalog",
    description:
      "The merchant sets policy once: max per-order amount, daily velocity ceiling, approval threshold, and allowed categories. Allowed categories are synced live with the merchant's real catalog — brand-new categories start blocked by default until explicitly enabled.",
    details: [
      "Dynamic catalog category sync ensures zero ungoverned product lines",
      "Cumulative velocity check monitors real-time daily spend counters across all agents",
      "Policy Advisor auto-generates calibrated starting values based on median catalog prices",
    ],
    tags: ["Live Catalog Sync", "Category Allow-Lists", "Daily Spend Velocity Pool", "Policy Advisor"],
    alignment: "right",
  },
  {
    id: "step-3",
    stepNum: "03",
    icon: GitFork,
    title: "The 4-Way Governed Decision Engine",
    badge: "Deterministic Decision Routing",
    pitchTime: "1:35 – 2:35 Core 4-Way Demo",
    description:
      "Rather than a rigid binary yes/no, SentryPay dynamically branches each purchase request into one of four governed outcomes designed to maximize merchant revenue while strictly enforcing risk boundaries.",
    visualType: "outcomes",
    details: [
      "Approve: In-policy purchases under threshold auto-checkout immediately",
      "Recover: Over-budget items trigger a smart catalog search, offering in-budget alternatives to save lost revenue",
      "Escalate: Purchases between the threshold and per-order limit pause safely for human merchant review",
      "Block: Disallowed categories or unauthorized policies are rejected with immutable plain-text reasons",
    ],
    tags: ["Approve", "Recover (Revenue Defense)", "Escalate", "Block"],
    alignment: "left",
  },
  {
    id: "step-4",
    stepNum: "04",
    icon: Clock3,
    title: "Human-in-the-Loop Approval Queue",
    badge: "Real-Time Oversight with Zero Lag",
    pitchTime: "2:35 – 3:00 Live Escalations",
    description:
      "Escalated high-value requests land instantly in the merchant's live Approval Queue. The merchant sees the item, amount, agent identity, and real-time trust score, granting a 1-tap Approve or Deny with 0ms optimistic UI responsiveness.",
    details: [
      "Instant optimistic UI removes resolved cards in 0ms with error rollback guards",
      "Agent Trust badge informs the merchant of the buyer agent's historical reliability",
      "Approved requests trigger automated background Razorpay order creation immediately",
    ],
    tags: ["0ms Optimistic UI", "Agent Trust Badge", "1-Tap Human Decision", "Real-Time Sync"],
    alignment: "right",
  },
  {
    id: "step-5",
    stepNum: "05",
    icon: CreditCard,
    title: "Protected Payment Execution via Razorpay",
    badge: "Isolated Payment Rails",
    pitchTime: "2:35 Order Settlement",
    description:
      "Only transactions with a valid approved verdict ever contact Razorpay. Autonomous agents never touch API secrets, private keys, or raw payment processor credentials. Real test-mode orders are generated safely and bound to the transaction.",
    details: [
      "Direct server-to-server Razorpay Orders API call (order_... generated with precise paise conversion)",
      "Strict credential isolation prevents agents from ever intercepting processor keys",
      "Live order ID is permanently bound to the audit record for merchant reconciliation",
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
    pitchTime: "3:15 – 3:45 Verdict Chain",
    description:
      "Every single decision — approve, recover, escalate, block, and outcome update — is cryptographically sealed and hash-chained to the prior block using immutable creation fields and SHA-256 hashing. A 1-click audit confirms 100% chain integrity back to the genesis block.",
    details: [
      "Serialized atomic queue (withChainLock) guarantees zero chain forks even during concurrent transactions",
      "Strictly monotonic timestamps prevent millisecond sorting ambiguities",
      "Interactive 1-click 'Verify Chain' recalculates all hashes from genesis block 000000... to present",
    ],
    tags: ["SHA-256 Chained Blocks", "1-Click Chain Verification", "Tamper-Evident Audit", "Self-Healing"],
    alignment: "right",
  },
  {
    id: "step-7",
    stepNum: "07",
    icon: TrendingUp,
    title: "Autonomous Trust Scores & Safe Growth Campaigns",
    badge: "Reputation & Governed Growth",
    pitchTime: "3:45 – 4:40 Trust & Campaigns",
    description:
      "Every agent develops an evolving trust score based on its transaction track record. Clean behavior grants lower friction, while repeated blocks trigger flagged scrutiny — without ever moving the merchant's hard caps. Meanwhile, the Growth Engine suggests temporary, 20%-capped rule boosts that auto-expire.",
    details: [
      "Dynamic agent trust scores (Flagged, Low, Neutral, Trusted, Verified) scale scrutiny safely",
      "Campaign suggestions auto-cap at 20% above base merchant rules to prevent reckless exposure",
      "Campaigns are time-boxed with explicit expiration times and attributed in every block's verdict reason",
    ],
    tags: ["Adaptive Scrutiny", "20% Safety Ceiling", "Auto-Expiring Campaigns", "Full Chain Attribution"],
    alignment: "center",
  },
];

export function HowItWorksRoadmap() {
  const [activeStep, setActiveStep] = useState<string>("step-1");

  const scrollToStep = (stepId: string) => {
    setActiveStep(stepId);
    const el = document.getElementById(stepId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section id="how-it-works-journey" className="relative z-10 w-full pt-12 pb-24">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-xs font-semibold text-brand-blue shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>The 5-Minute Architecture Blueprint</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
          How SentryPay Works
        </h2>

        <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
          The end-to-end journey from an autonomous AI buyer intent to governed policy evaluation, instant Razorpay settlement, and tamper-evident cryptographic ledgers.
        </p>
      </div>

      {/* 5-Minute Pitch Mode Timeline Bar */}
      <div className="mt-10 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-brand-blue/30 bg-[#071D3A]/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand-blue animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue font-mono">
                5-Minute Pitch Presentation Guide
              </span>
            </div>
            <span className="text-[11px] text-white/50">
              Click any stage to jump directly to that step
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {ROADMAP_STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToStep(s.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition shrink-0 cursor-pointer border",
                  activeStep === s.id
                    ? "bg-brand-blue text-white border-brand-blue shadow-[0_0_12px_rgba(13,148,251,0.5)]"
                    : "bg-white/5 text-white/70 border-white/10 hover:border-white/25 hover:bg-white/10"
                )}
              >
                <span>{s.stepNum}. {s.pitchTime.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* S-Curve Pathway Layout (Alternating Left / Right) */}
      <div className="relative mt-16 max-w-4xl mx-auto px-4 sm:px-6">
        {ROADMAP_STEPS.map((step, idx) => {
          const isLeft = step.alignment === "left";
          const isRight = step.alignment === "right";
          const isCenter = step.alignment === "center";
          const isLast = idx === ROADMAP_STEPS.length - 1;
          const nextStep = ROADMAP_STEPS[idx + 1];

          const Icon = step.icon;

          return (
            <div key={step.id} id={step.id} className="relative scroll-mt-24">
              {/* Card Container */}
              <div
                className={cn(
                  "w-full transition-all duration-300",
                  isLeft && "md:mr-auto md:w-[86%] lg:w-[82%]",
                  isRight && "md:ml-auto md:w-[86%] lg:w-[82%]",
                  isCenter && "mx-auto md:w-[92%] lg:w-[88%]"
                )}
              >
                <div className="rounded-[28px] p-6 sm:p-8 transition-all duration-300 relative border-2 border-brand-blue/35 bg-[#071D3A]/95 shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:border-brand-blue hover:shadow-[0_0_32px_rgba(13,148,251,0.25)]">
                  {/* Top Row: Icon Badge (Left) & Step Number Pill (Right) */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Left Icon Badge */}
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-brand-blue bg-brand-blue/20 text-brand-blue shadow-inner">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>

                    {/* Right Step Number Badge */}
                    <span className="rounded-full bg-[#001733] border border-white/20 px-3.5 py-1 text-xs font-mono font-black text-white tracking-widest shadow-sm">
                      {step.stepNum}
                    </span>
                  </div>

                  {/* Headline Title */}
                  <h3 className="mt-5 text-2xl sm:text-3xl font-black tracking-tight text-white leading-snug">
                    {step.title}
                  </h3>

                  {/* Pitch Timestamp Pill */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                      {step.pitchTime}
                    </span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs font-medium text-white/60">
                      {step.badge}
                    </span>
                  </div>

                  {/* Description Paragraph */}
                  <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/75 font-normal">
                    {step.description}
                  </p>

                  {/* Step 3 Special Visual: The 4 Decision Outcomes Grid */}
                  {step.visualType === "outcomes" && (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3.5 rounded-xl border border-success/30 bg-success/10 text-success flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                        <div>
                          <span className="text-xs font-bold block text-success">Approve (Instant)</span>
                          <span className="text-[11px] block mt-0.5 text-white/70">
                            Under ₹2,000 threshold. Auto-creates live Razorpay test order.
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-start gap-2.5">
                        <RotateCcw className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          <span className="text-xs font-bold block text-amber-400">Recover (Defend Sale)</span>
                          <span className="text-[11px] block mt-0.5 text-white/70">
                            Exceeds per-order cap. Offers in-budget alternative in same category.
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-brand-blue/30 bg-brand-blue/10 text-brand-blue flex items-start gap-2.5">
                        <Clock3 className="h-4 w-4 shrink-0 mt-0.5 text-brand-blue" />
                        <div>
                          <span className="text-xs font-bold block text-brand-blue">Escalate (Human Sign-off)</span>
                          <span className="text-[11px] block mt-0.5 text-white/70">
                            Between ₹2,000 and ₹5,000 cap. Pauses for 1-tap merchant decision.
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2.5">
                        <Ban className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                        <div>
                          <span className="text-xs font-bold block text-destructive">Block (Disallowed)</span>
                          <span className="text-[11px] block mt-0.5 text-white/70">
                            Disallowed category or limit breach. Refused with immutable logged reason.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bullet Highlights */}
                  <ul className="mt-5 space-y-2 border-t border-white/10 pt-4">
                    {step.details.map((detail, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-blue shrink-0 mt-2" />
                        <span className="text-white/70">{detail}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bottom Pill Tags */}
                  <div className="mt-5 flex flex-wrap gap-2 pt-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2.5 py-1 text-[11px] font-mono font-medium border border-brand-blue/20 bg-brand-blue/10 text-brand-blue"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* S-Curve Connector between Steps */}
              {!isLast && nextStep && (
                <div className="w-full py-4 sm:py-6 flex items-center justify-center relative">
                  {/* Desktop S-Curve SVG Pathway */}
                  <div className="hidden md:block w-full h-24 lg:h-28 relative">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 1000 120"
                      preserveAspectRatio="none"
                      fill="none"
                    >
                      <defs>
                        <marker
                          id={`arrow-head-roadmap-${step.stepNum}`}
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto"
                        >
                          <path d="M 0 1 L 9 5 L 0 9 z" fill="#0D94FB" />
                        </marker>
                      </defs>

                      {/* Transition Left Card to Right Card */}
                      {isLeft && nextStep.alignment === "right" && (
                        <path
                          d="M 280 0 C 280 65, 720 55, 720 114"
                          stroke="#0D94FB"
                          strokeWidth="3.5"
                          strokeDasharray="8 8"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-roadmap-${step.stepNum})`}
                        />
                      )}

                      {/* Transition Right Card to Left Card */}
                      {isRight && nextStep.alignment === "left" && (
                        <path
                          d="M 720 0 C 720 65, 280 55, 280 114"
                          stroke="#0D94FB"
                          strokeWidth="3.5"
                          strokeDasharray="8 8"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-roadmap-${step.stepNum})`}
                        />
                      )}

                      {/* Transition Right Card to Center Card (Step 6 -> Step 7) */}
                      {isRight && nextStep.alignment === "center" && (
                        <path
                          d="M 720 0 C 720 65, 500 55, 500 114"
                          stroke="#0D94FB"
                          strokeWidth="3.5"
                          strokeDasharray="8 8"
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-head-roadmap-${step.stepNum})`}
                        />
                      )}
                    </svg>
                  </div>

                  {/* Mobile Connector: Clean Vertical Dashed Line with Arrowhead */}
                  <div className="md:hidden flex flex-col items-center justify-center my-2">
                    <div className="w-0 h-14 border-l-2 border-dashed border-brand-blue" />
                    <ChevronDown className="h-5 w-5 -mt-1 text-brand-blue" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pitch Summary: 3 Distinctions from a Generic Checkout Bot */}
      <div className="mt-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl p-8 sm:p-10 border-2 border-brand-blue/40 bg-[#071D3A]/95 shadow-[0_16px_40px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-md">
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-blue">
              The 5-Minute Pitch Closing Argument
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              Why SentryPay is Not Just Another Checkout Bot
            </h3>
            <p className="mt-3 text-sm sm:text-base text-white/70">
              Three core pillars make this the definitive trust and governance gateway for agentic commerce:
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 mb-3">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-base text-white">
                1. Smart Recovery Flow
              </h4>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/65">
                Turns blocked, over-budget sales into closed orders by automatically offering nearest in-budget catalog alternatives in the exact same category.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue mb-3">
                <Link2 className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-base text-white">
                2. Cryptographic Audit Chain
              </h4>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/65">
                SHA-256 tamper-evident ledger sealing every approve, recover, escalate, and block event with 1-click end-to-end verification.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-base text-white">
                3. Industry Alignment
              </h4>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/65">
                Identity and policy patterns aligning with Google's AP2 signed mandates and NPCI's delegated UPI spend frameworks.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div className="text-xs text-white/50">
              Ready to test the policy firewall live?
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition cursor-pointer"
            >
              <span>Launch Merchant Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
