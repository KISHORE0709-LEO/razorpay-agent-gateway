import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  GitFork,
  Clock3,
  CreditCard,
  Link2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  Sparkles,
  Bot,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepData {
  id: string;
  stepNum: string;
  icon: any;
  title: string;
  badge: string;
  pitchTime: string;
  description: string;
  details: string[];
  visualType?: "outcomes" | "metrics" | "code" | "tags";
  tags?: string[];
  samplePayload?: string;
  alignment: "left" | "right" | "center";
}

const STEPS: StepData[] = [
  {
    id: "step-1",
    stepNum: "01",
    icon: Bot,
    title: "AI Buyer Dispatches Purchase Intent",
    badge: "Autonomous Agent Ingestion",
    pitchTime: "0:00 – 0:25 The Hook",
    description:
      "An autonomous AI agent shops on a customer's behalf. It parses natural language intent, extracts budget caps, and presents its verified cryptographic agent identity (e.g. agt_live_7f3c9e). No payment can reach Razorpay without first passing through SentryPay.",
    details: [
      "Interoperable with AP2 signed mandates and NPCI's delegated UPI spend frameworks",
      "Validates agent identity and session authenticity prior to transaction processing",
      "Extracts requested product name, target price, and category parameters",
    ],
    tags: ["Agent Identity: agt_live_7f3c9e", "AP2 Mandates", "Delegated UPI Spend"],
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
      "The merchant defines policy once: max per-order amount, daily velocity ceiling, approval threshold, and allowed categories. Allowed categories are synced live with the merchant's real catalog — brand-new categories start blocked by default until explicitly enabled.",
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

export default function HowItWorks() {
  const [theme, setTheme] = useState<"cyber" | "paper">("cyber");
  const [activeStep, setActiveStep] = useState<string>("step-1");

  const scrollToStep = (stepId: string) => {
    setActiveStep(stepId);
    const el = document.getElementById(stepId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isPaper = theme === "paper";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-500 selection:bg-brand-blue selection:text-white font-sans",
        isPaper
          ? "bg-[#FAF4DE] text-[#0C2651]"
          : "bg-[#0A192F] text-white"
      )}
    >
      {/* Background Ambience */}
      {!isPaper ? (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-brand-blue/15 blur-[140px]" />
          <div className="absolute top-[40%] -left-40 h-[600px] w-[600px] rounded-full bg-[#012652]/40 blur-[160px]" />
          <div className="absolute bottom-10 right-0 h-[500px] w-[500px] rounded-full bg-brand-blue/10 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0D94FB08_1px,transparent_1px),linear-gradient(to_bottom,#0D94FB08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#0C26510D_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
      )}

      {/* Top Navbar */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
          isPaper
            ? "border-[#0C2651]/15 bg-[#FAF4DE]/90"
            : "border-white/10 bg-[#0A192F]/85"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue shadow-[0_0_16px_rgba(13,148,251,0.4)] text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              Sentry<span className="text-brand-blue">Pay</span>
            </span>
          </Link>

          <nav
            className={cn(
              "hidden md:flex items-center gap-1 rounded-full p-1 border shadow-xs",
              isPaper
                ? "border-[#0C2651]/20 bg-white/60"
                : "border-white/10 bg-white/[0.04]"
            )}
          >
            <Link
              to="/"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                isPaper ? "text-[#0C2651]/70 hover:text-[#0C2651]" : "text-white/60 hover:text-white"
              )}
            >
              Home
            </Link>
            <span
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-xs",
                isPaper
                  ? "bg-[#0C2651] text-white"
                  : "bg-brand-blue text-white"
              )}
            >
              How it works
            </span>
            <Link
              to="/security"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                isPaper ? "text-[#0C2651]/70 hover:text-[#0C2651]" : "text-white/60 hover:text-white"
              )}
            >
              Security
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isPaper ? "cyber" : "paper")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer shadow-xs",
                isPaper
                  ? "border-[#0C2651]/30 bg-white hover:bg-[#0C2651]/5 text-[#0C2651]"
                  : "border-white/15 bg-white/5 hover:bg-white/10 text-white"
              )}
              title="Toggle between Cyber Navy (Brand Theme) and Studio Paper (Photo Theme)"
            >
              {isPaper ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#0C2651]" />
                  <span className="hidden sm:inline">Theme: Studio Paper</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-warning" />
                  <span className="hidden sm:inline">Theme: Cyber Navy</span>
                </>
              )}
            </button>

            <Link
              to="/login"
              className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-110 transition flex items-center gap-1.5"
            >
              <span>Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-12 lg:py-16">
        {/* Back navigation */}
        <Link
          to="/"
          className={cn(
            "inline-flex items-center gap-2 text-xs font-semibold tracking-wide transition mb-8",
            isPaper
              ? "text-[#0C2651]/60 hover:text-[#0C2651]"
              : "text-white/50 hover:text-white"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Link>

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border shadow-xs",
              isPaper
                ? "border-[#0C2651]/30 bg-white/80 text-[#0C2651]"
                : "border-brand-blue/30 bg-brand-blue/10 text-brand-blue"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous AI Commerce Architecture</span>
          </div>

          <h1
            className={cn(
              "text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]",
              isPaper ? "text-[#0C2651]" : "text-white"
            )}
          >
            How SentryPay Works
          </h1>

          <p
            className={cn(
              "text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal",
              isPaper ? "text-[#0C2651]/80" : "text-white/70"
            )}
          >
            The complete 7-step journey from an autonomous AI buyer intent to verified Razorpay order settlement and cryptographic audit trails.
          </p>
        </div>

        {/* 5-Minute Pitch Mode Bar */}
        <div
          className={cn(
            "mt-10 rounded-2xl p-4 border transition-all shadow-sm",
            isPaper
              ? "bg-white/80 border-[#0C2651]/20 shadow-[4px_4px_0px_0px_#0C2651]"
              : "bg-[#012652]/70 border-brand-blue/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-current/10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-brand-blue animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                5-Minute Pitch Presentation Guide
              </span>
            </div>
            <span className={cn("text-[11px]", isPaper ? "text-[#0C2651]/60" : "text-white/50")}>
              Click any section below to jump to that architecture stage
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToStep(s.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition shrink-0 cursor-pointer border",
                  activeStep === s.id
                    ? isPaper
                      ? "bg-[#0C2651] text-white border-[#0C2651]"
                      : "bg-brand-blue text-white border-brand-blue shadow-[0_0_12px_rgba(13,148,251,0.5)]"
                    : isPaper
                    ? "bg-[#FAF4DE] text-[#0C2651]/80 border-[#0C2651]/15 hover:border-[#0C2651]/40"
                    : "bg-white/5 text-white/70 border-white/10 hover:border-white/25"
                )}
              >
                <span>{s.stepNum}. {s.pitchTime.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* S-Curve Pathway Roadmap Container */}
        <div className="relative mt-16 sm:mt-20 max-w-4xl mx-auto">
          {STEPS.map((step, idx) => {
            const isLeft = step.alignment === "left";
            const isRight = step.alignment === "right";
            const isCenter = step.alignment === "center";
            const isLast = idx === STEPS.length - 1;
            const nextStep = STEPS[idx + 1];

            const Icon = step.icon;

            return (
              <div key={step.id} id={step.id} className="relative scroll-mt-28">
                {/* Card Element */}
                <div
                  className={cn(
                    "w-full transition-all duration-300",
                    isLeft && "md:mr-auto md:w-[86%] lg:w-[80%]",
                    isRight && "md:ml-auto md:w-[86%] lg:w-[80%]",
                    isCenter && "mx-auto md:w-[92%] lg:w-[88%]"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-[28px] p-6 sm:p-8 transition-all duration-300 relative border-2",
                      isPaper
                        ? "bg-[#FFFDF6] border-[#0C2651] shadow-[6px_6px_0px_0px_#0C2651] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#0C2651]"
                        : "bg-[#071D3A]/90 border-brand-blue/35 shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:border-brand-blue hover:shadow-[0_0_30px_rgba(13,148,251,0.25)]"
                    )}
                  >
                    {/* Top Row: Icon Badge (Left) & Step Number Pill (Right) */}
                    <div className="flex items-center justify-between gap-4">
                      {/* Left Icon Badge */}
                      <div
                        className={cn(
                          "flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border-2 transition-transform duration-200 shadow-sm",
                          isPaper
                            ? "bg-[#FFE799] border-[#0C2651] text-[#0C2651]"
                            : "bg-brand-blue/20 border-brand-blue text-brand-blue"
                        )}
                      >
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>

                      {/* Right Step Number Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-3.5 py-1 text-xs font-mono font-black tracking-widest border",
                            isPaper
                              ? "bg-[#0C2651] border-[#0C2651] text-white"
                              : "bg-[#001733] border-white/20 text-white"
                          )}
                        >
                          {step.stepNum}
                        </span>
                      </div>
                    </div>

                    {/* Headline Title */}
                    <h2
                      className={cn(
                        "mt-5 text-2xl sm:text-3xl font-black tracking-tight leading-snug",
                        isPaper ? "text-[#0C2651]" : "text-white"
                      )}
                    >
                      {step.title}
                    </h2>

                    {/* Pitch Timestamp Pill */}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md",
                          isPaper
                            ? "bg-[#0C2651]/10 text-[#0C2651]"
                            : "bg-brand-blue/15 text-brand-blue"
                        )}
                      >
                        {step.pitchTime}
                      </span>
                      <span className={cn("text-xs", isPaper ? "text-[#0C2651]/50" : "text-white/40")}>•</span>
                      <span className={cn("text-xs font-medium", isPaper ? "text-[#0C2651]/70" : "text-white/60")}>
                        {step.badge}
                      </span>
                    </div>

                    {/* Description Paragraph */}
                    <p
                      className={cn(
                        "mt-4 text-sm sm:text-base leading-relaxed font-normal",
                        isPaper ? "text-[#0C2651]/85" : "text-white/75"
                      )}
                    >
                      {step.description}
                    </p>

                    {/* Step 3 Special Visual: The 4 Decision Outcoms Grid */}
                    {step.visualType === "outcomes" && (
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                          className={cn(
                            "p-3 rounded-xl border flex items-start gap-2.5",
                            isPaper
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                              : "bg-success/10 border-success/30 text-success"
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                          <div>
                            <span className="text-xs font-bold block text-success">Approve (Instant)</span>
                            <span className={cn("text-[11px] block mt-0.5", isPaper ? "text-emerald-900" : "text-white/70")}>
                              Under ₹2,000 threshold. Auto-creates live Razorpay test order.
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-3 rounded-xl border flex items-start gap-2.5",
                            isPaper
                              ? "bg-amber-50 border-amber-300 text-amber-950"
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          )}
                        >
                          <RotateCcw className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <span className="text-xs font-bold block text-amber-500">Recover (Defend Sale)</span>
                            <span className={cn("text-[11px] block mt-0.5", isPaper ? "text-amber-900" : "text-white/70")}>
                              Exceeds per-order cap. Offers in-budget alternative in same category.
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-3 rounded-xl border flex items-start gap-2.5",
                            isPaper
                              ? "bg-blue-50 border-blue-300 text-blue-950"
                              : "bg-brand-blue/10 border-brand-blue/30 text-brand-blue"
                          )}
                        >
                          <Clock3 className="h-4 w-4 shrink-0 mt-0.5 text-brand-blue" />
                          <div>
                            <span className="text-xs font-bold block text-brand-blue">Escalate (Human Sign-off)</span>
                            <span className={cn("text-[11px] block mt-0.5", isPaper ? "text-blue-900" : "text-white/70")}>
                              Between ₹2,000 and ₹5,000 cap. Pauses for 1-tap merchant decision.
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "p-3 rounded-xl border flex items-start gap-2.5",
                            isPaper
                              ? "bg-red-50 border-red-300 text-red-950"
                              : "bg-destructive/10 border-destructive/30 text-destructive"
                          )}
                        >
                          <Ban className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                          <div>
                            <span className="text-xs font-bold block text-destructive">Block (Disallowed)</span>
                            <span className={cn("text-[11px] block mt-0.5", isPaper ? "text-red-900" : "text-white/70")}>
                              Disallowed category or limit breach. Refused with immutable logged reason.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bullet Highlights */}
                    <ul className="mt-5 space-y-2 border-t border-current/10 pt-4">
                      {step.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-blue shrink-0 mt-2" />
                          <span className={isPaper ? "text-[#0C2651]/80" : "text-white/70"}>
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Bottom Pill Tags */}
                    {step.tags && (
                      <div className="mt-5 flex flex-wrap gap-2 pt-2">
                        {step.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-mono font-medium border",
                              isPaper
                                ? "bg-white border-[#0C2651]/20 text-[#0C2651]"
                                : "bg-white/5 border-white/10 text-brand-blue"
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* S-Curve Connector to the Next Step (Only rendered between steps) */}
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
                            id={`arrow-head-${step.stepNum}`}
                            viewBox="0 0 10 10"
                            refX="6"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto"
                          >
                            <path d="M 0 1 L 9 5 L 0 9 z" fill={isPaper ? "#0C2651" : "#0D94FB"} />
                          </marker>
                        </defs>

                        {/* If transitioning Left Card to Right Card */}
                        {isLeft && nextStep.alignment === "right" && (
                          <path
                            d="M 280 0 C 280 65, 720 55, 720 114"
                            stroke={isPaper ? "#0C2651" : "#0D94FB"}
                            strokeWidth="3.5"
                            strokeDasharray="8 8"
                            strokeLinecap="round"
                            markerEnd={`url(#arrow-head-${step.stepNum})`}
                          />
                        )}

                        {/* If transitioning Right Card to Left Card */}
                        {isRight && nextStep.alignment === "left" && (
                          <path
                            d="M 720 0 C 720 65, 280 55, 280 114"
                            stroke={isPaper ? "#0C2651" : "#0D94FB"}
                            strokeWidth="3.5"
                            strokeDasharray="8 8"
                            strokeLinecap="round"
                            markerEnd={`url(#arrow-head-${step.stepNum})`}
                          />
                        )}

                        {/* If transitioning Right Card to Center Card (Step 6 -> Step 7) */}
                        {isRight && nextStep.alignment === "center" && (
                          <path
                            d="M 720 0 C 720 65, 500 55, 500 114"
                            stroke={isPaper ? "#0C2651" : "#0D94FB"}
                            strokeWidth="3.5"
                            strokeDasharray="8 8"
                            strokeLinecap="round"
                            markerEnd={`url(#arrow-head-${step.stepNum})`}
                          />
                        )}
                      </svg>
                    </div>

                    {/* Mobile Connector: Clean Vertical Dashed Line with Arrowhead */}
                    <div className="md:hidden flex flex-col items-center justify-center my-2">
                      <div
                        className={cn(
                          "w-0 h-14 border-l-2 border-dashed",
                          isPaper ? "border-[#0C2651]" : "border-brand-blue"
                        )}
                      />
                      <ChevronDown
                        className={cn("h-5 w-5 -mt-1", isPaper ? "text-[#0C2651]" : "text-brand-blue")}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pitch Summary: 3 Distinctions from a Generic Checkout Bot */}
        <div
          className={cn(
            "mt-24 rounded-3xl p-8 sm:p-10 border-2 transition-all shadow-md relative overflow-hidden",
            isPaper
              ? "bg-[#FFFDF6] border-[#0C2651] shadow-[8px_8px_0px_0px_#0C2651]"
              : "bg-[#0B2144]/90 border-brand-blue/40 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
          )}
        >
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-blue">
              The 5-Minute Pitch Closing Argument
            </span>
            <h3
              className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight mt-2",
                isPaper ? "text-[#0C2651]" : "text-white"
              )}
            >
              Why SentryPay is Not Just Another Checkout Bot
            </h3>
            <p className={cn("mt-3 text-sm sm:text-base", isPaper ? "text-[#0C2651]/80" : "text-white/70")}>
              Three key pillars make this the definitive trust and governance gateway for agentic commerce:
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              className={cn(
                "p-5 rounded-2xl border",
                isPaper
                  ? "bg-[#FAF4DE] border-[#0C2651]/20"
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 mb-3">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h4 className={cn("font-bold text-base", isPaper ? "text-[#0C2651]" : "text-white")}>
                1. Smart Recovery Flow
              </h4>
              <p className={cn("mt-2 text-xs sm:text-sm leading-relaxed", isPaper ? "text-[#0C2651]/75" : "text-white/65")}>
                Turns blocked, over-budget sales into closed orders by automatically offering nearest in-budget catalog alternatives in the exact same category.
              </p>
            </div>

            <div
              className={cn(
                "p-5 rounded-2xl border",
                isPaper
                  ? "bg-[#FAF4DE] border-[#0C2651]/20"
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue mb-3">
                <Link2 className="h-5 w-5" />
              </div>
              <h4 className={cn("font-bold text-base", isPaper ? "text-[#0C2651]" : "text-white")}>
                2. Cryptographic Audit Chain
              </h4>
              <p className={cn("mt-2 text-xs sm:text-sm leading-relaxed", isPaper ? "text-[#0C2651]/75" : "text-white/65")}>
                SHA-256 tamper-evident ledger sealing every approve, recover, escalate, and block event with 1-click end-to-end verification.
              </p>
            </div>

            <div
              className={cn(
                "p-5 rounded-2xl border",
                isPaper
                  ? "bg-[#FAF4DE] border-[#0C2651]/20"
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className={cn("font-bold text-base", isPaper ? "text-[#0C2651]" : "text-white")}>
                3. Industry Alignment
              </h4>
              <p className={cn("mt-2 text-xs sm:text-sm leading-relaxed", isPaper ? "text-[#0C2651]/75" : "text-white/65")}>
                Identity and policy patterns aligning with Google's AP2 signed mandates and NPCI's delegated UPI spend frameworks.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-current/10">
            <div className={cn("text-xs", isPaper ? "text-[#0C2651]/70" : "text-white/50")}>
              Ready to explore live policy enforcement?
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition cursor-pointer"
              >
                <span>Launch Merchant Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
