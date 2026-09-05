import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import HowItWorks from "./HowItWorks";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

const shell = "min-h-screen bg-brand-cadet text-white";

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue">
          <ShieldCheck className="h-4 w-4 text-white" />
        </span>
        <span>
          Sentry<span className="text-brand-blue">Pay</span>
        </span>
      </Link>
      <Link to="/login" className="rounded-full bg-brand-blue px-4 py-2 text-xs font-semibold text-white">
        Enter workspace
      </Link>
    </header>
  );
}

export { HowItWorks };

export function FeaturesPage() {
  return (
    <div className={shell}>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
        <FeaturesSection />
      </main>
    </div>
  );
}

import { AboutMeSection } from "@/components/landing/AboutMeSection";

// Keep Security as alias/fallback pointing to Features
export const Security = FeaturesPage;
export const Features = FeaturesPage;

export function AboutMePage() {
  return (
    <div className={shell}>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
        <AboutMeSection />
      </main>
    </div>
  );
}
export const AboutMe = AboutMePage;
