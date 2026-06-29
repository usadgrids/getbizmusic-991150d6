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
      <div className="relative max-w-6xl mx-auto px-4 py-6 sm:py-10 lg:py-14 text-center">
        <div className="inline-flex items-center gap-2 bg-[#D4A24C]/15 border border-[#D4A24C]/40 text-[#D4A24C] px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <Sparkles size={14} /> USADGRIDS NOVELTY ADVERTISING - A WINALL MEDIA LLC CREATIVE.
        </div>
        <div className="mx-auto max-w-3xl mb-5 bg-[#D4A24C] text-[#0F2A4A] border-2 border-[#D4A24C] rounded-xl px-4 py-3 text-base sm:text-lg font-semibold shadow-lg">
          NOW OPEN TO ALL National City Businesses Only.
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
          Novelty Buusiness Ads With Music Streaming
          <br className="hidden sm:block" /> Gets Your Business <span className="text-[#D4A24C]">Seen</span>.
          <br className="hidden sm:block" /> Every Day. All Year Long for Just $12
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
          Get your business in front of National City visitors as they browse our novelty ads directory — with music keeping them right where you want them.
          <span className="block mt-2 text-[#D4A24C] font-semibold">
            Really Special Introductory Limited Time Offer — $1/month, billed $12/year.
          </span>
          Option to resubscribe at the end of your annual term. Prices may change.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/submit"
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-6 py-3 rounded-md hover:bg-[#e0b266] transition-colors shadow-lg"
          >
            Submit Your Ad — $12/yr
          </Link>
        </div>
      </div>
    </header>
  );
}
