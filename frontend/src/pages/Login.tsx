import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useFirewall } from "@/lib/store";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useFirewall();
  const [email, setEmail] = useState("merchant@acme.co");
  const [password, setPassword] = useState("demo1234");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login(email || "merchant@acme.co");
    navigate("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-cadet px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow opacity-80" />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-md sm:p-9">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/15 ring-1 ring-brand-blue/30">
            <ShieldCheck className="h-6 w-6 text-brand-blue" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-white/50">
            Sign in to your SentryPay merchant workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/70">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-black/10 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                placeholder="you@company.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-white/70">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/10 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="••••••••"
                />
              </div>
            </label>
            <button
              type="submit"
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-sm font-semibold text-white shadow-[0_0_28px_rgba(13,148,251,0.25)] transition hover:brightness-110"
            >
              Log in to dashboard
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <div className="flex items-center justify-between text-xs"><Link to="/forgot-password" className="text-white/45 hover:text-brand-blue">Forgot password?</Link><Link to="/signup" className="font-semibold text-brand-blue hover:underline">Create account</Link></div>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
            Demo workspace · No real authentication or payments are processed
          </p>
        </div>
      </div>
    </div>
  );
}
