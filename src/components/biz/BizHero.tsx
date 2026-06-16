import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function BizHero() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#0F2A4A] via-[#163864] to-[#0F2A4A] text-white">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage:
          "radial-gradient(circle at 20% 30%, #D4A24C 0px, transparent 2px), radial-gradient(circle at 80% 70%, #D4A24C 0px, transparent 2px)",
        backgroundSize: "50px 50px",
      }} />
      <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#D4A24C]/15 border border-[#D4A24C]/40 text-[#D4A24C] px-3 py-1 rounded-full text-xs font-semibold mb-5">
          <Sparkles size={14} /> LOCAL BUSINESS ADVERTISING
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
          Novelty Ads Get Your Business <span className="text-[#D4A24C]">Seen</span>.
          <br className="hidden sm:block" /> Every Day. All Year Long.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
          Reach local customers with rotating image ads on our high-traffic directory.
          From restaurants to lawyers — a full year of exposure for as little as $5.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/submit"
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-6 py-3 rounded-md hover:bg-[#e0b266] transition-colors shadow-lg"
          >
            Submit Your Ad — From $5
          </Link>
          <a
            href="#pricing"
            className="border border-white/40 px-6 py-3 rounded-md hover:bg-white/10 transition-colors"
          >
            View Pricing
          </a>
        </div>
      </div>
    </header>
  );
}
