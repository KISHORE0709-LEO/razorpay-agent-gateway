import { Sparkles, Github, Linkedin, Globe, Twitter, Mail } from "lucide-react";
import devAvatar from "@/assets/17.png";

export function AboutMeSection() {
  return (
    <section id="about-me" className="relative z-10 w-full py-20 px-4 sm:px-6">
      {/* Top Header Badge & Title */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#14b8a6]/40 bg-[#14b8a6]/10 px-4 py-1 text-xs font-semibold tracking-wider text-[#2dd4bf] uppercase shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#2dd4bf]" />
          <span>Meet the Developer</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Meet the Developer
        </h2>

        <p className="text-sm sm:text-base text-white/65 leading-relaxed">
          The engineer behind SentryPay
        </p>
      </div>

      {/* Profile Card matching reference design */}
      <div className="mt-12 max-w-[500px] mx-auto">
        <div className="relative rounded-[2.5rem] border border-cyan-400/25 bg-[#071D3A]/90 p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden text-center transition-all duration-300 hover:border-cyan-400/45 hover:shadow-[0_0_35px_rgba(45,212,191,0.2)]">
          {/* Subtle Ambient Radial Glow Behind Avatar */}
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-cyan-400/20 via-emerald-400/10 to-transparent rounded-full blur-3xl" />

          {/* Circular Animated Avatar */}
          <div className="relative mx-auto w-40 h-40 sm:w-44 sm:h-44">
            <div className="w-full h-full rounded-full p-1 bg-gradient-to-tr from-[#0D94FB] via-[#2dd4bf] to-[#10b981] shadow-[0_0_28px_rgba(45,212,191,0.35)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0A192F] border-4 border-[#2dd4bf]">
                <img
                  src={devAvatar}
                  alt="M Kishore - Developer"
                  className="w-full h-full object-cover object-center transform transition-transform duration-500 hover:scale-110"
                />
              </div>
            </div>
          </div>

          {/* Name & Title */}
          <div className="mt-6">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              M KISHORE
            </h3>
            <span className="block mt-1 text-xs font-bold tracking-[0.25em] text-[#2dd4bf] uppercase font-mono">
              DEVELOPER
            </span>
          </div>

          {/* Social Icons Row */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="https://github.com/KISHORE0709-LEO"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 text-[#2dd4bf] transition-all duration-200 hover:bg-[#2dd4bf]/25 hover:border-[#2dd4bf] hover:scale-110 shadow-xs"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 text-[#2dd4bf] transition-all duration-200 hover:bg-[#2dd4bf]/25 hover:border-[#2dd4bf] hover:scale-110 shadow-xs"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/KISHORE0709-LEO/razorpay-agent-gateway"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 text-[#2dd4bf] transition-all duration-200 hover:bg-[#2dd4bf]/25 hover:border-[#2dd4bf] hover:scale-110 shadow-xs"
            >
              <Globe className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 text-[#2dd4bf] transition-all duration-200 hover:bg-[#2dd4bf]/25 hover:border-[#2dd4bf] hover:scale-110 shadow-xs"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="mailto:kishore@example.com"
              aria-label="Email"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2dd4bf]/30 bg-[#2dd4bf]/10 text-[#2dd4bf] transition-all duration-200 hover:bg-[#2dd4bf]/25 hover:border-[#2dd4bf] hover:scale-110 shadow-xs"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>

          {/* Bio Description */}
          <p className="mt-7 text-xs sm:text-sm leading-relaxed text-white/75 font-normal max-w-sm mx-auto">
            Passionate about building resilient, high-performance web applications with Next.js, TypeScript, React, and modern cloud databases.
          </p>

          {/* Skills / Tech Stack Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/5 px-3.5 py-1 text-xs font-mono font-medium text-[#2dd4bf] shadow-2xs">
              Next.js 16
            </span>
            <span className="rounded-xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/5 px-3.5 py-1 text-xs font-mono font-medium text-[#2dd4bf] shadow-2xs">
              TypeScript
            </span>
            <span className="rounded-xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/5 px-3.5 py-1 text-xs font-mono font-medium text-[#2dd4bf] shadow-2xs">
              Firebase Firestore
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/5 px-3.5 py-1 text-xs font-mono font-medium text-[#2dd4bf] shadow-2xs">
              TailwindCSS
            </span>
            <span className="rounded-xl border border-[#2dd4bf]/25 bg-[#2dd4bf]/5 px-3.5 py-1 text-xs font-mono font-medium text-[#2dd4bf] shadow-2xs">
              Node.js
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
