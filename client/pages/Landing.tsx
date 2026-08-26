import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { FirewallFlowAnimation } from "@/components/landing/FirewallFlowAnimation";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-cadet text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            Sentry<span className="text-brand-blue">Pay</span>
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
        >
          Enter Dashboard
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-brand-blue" />
            Payment firewall for autonomous AI agents
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            Let AI agents shop.
            <br />
            <span className="text-glow text-brand-blue">Never let them overspend.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            Every purchase an AI buyer makes is checked against your rules in
            real time — approved, recovered with a cheaper alternative,
            escalated for a human, or blocked. Only what passes ever reaches
            Razorpay.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_rgba(13,148,251,0.4)] transition hover:brightness-110"
            >
              Enter Dashboard
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <span className="text-xs text-white/40">
              Test-mode Razorpay integration &middot; no real charges
            </span>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 max-w-md">
            <div>
              <dt className="text-2xl font-bold text-white">4</dt>
              <dd className="text-xs text-white/50">Decision paths</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-white">&lt;50ms</dt>
              <dd className="text-xs text-white/50">Rule evaluation</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-white">100%</dt>
              <dd className="text-xs text-white/50">Hash-chained audit</dd>
            </div>
          </dl>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-brand-blue/10 blur-3xl" />
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
            <FirewallFlowAnimation />
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-6 text-center text-xs text-white/40 sm:px-10">
        Built for AI agents that spend real money — safely.
      </footer>
    </div>
  );
}
