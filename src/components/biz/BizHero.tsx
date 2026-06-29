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
      <div className="relative max-w-6xl mx-auto px-4 py-3 sm:py-4 lg:py-8 text-center">
        <div className="inline-flex items-center gap-2 bg-[#D4A24C]/15 border border-[#D4A24C]/40 text-[#D4A24C] px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3">
          <Sparkles size={14} /> USADGRIDS NOVELTY ADVERTISING - A WINALL MEDIA LLC CREATIVE.
        </div>
        <div className="mx-auto max-w-3xl mb-3 sm:mb-4 bg-[#D4A24C] text-[#0F2A4A] border-2 border-[#D4A24C] rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base lg:text-lg font-semibold shadow-lg">
          NOW OPEN TO ALL National City Businesses Only.
        </div>
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-snug sm:leading-tight">
          Novelty Buusiness Ads With Music Streaming
          <br className="hidden lg:block" /> Gets Your Business <span className="text-[#D4A24C]">Seen</span>.
          <br className="hidden lg:block" /> Every Day. All Year Long for Just $12
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base text-white/80 max-w-2xl mx-auto">
          Get your business in front of National City visitors as they browse our novelty ads directory — with music keeping them right where you want them.
          <span className="block mt-1 sm:mt-2 text-[#D4A24C] font-semibold">
            Really Special Introductory Limited Time Offer — $1/month, billed $12/year.
          </span>
          Option to resubscribe at the end of your annual term. Prices may change.
        </p>
        <div className="mt-4 sm:mt-5 flex flex-wrap justify-center gap-3">
          <Link
            to="/submit"
            className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-md hover:bg-[#e0b266] transition-colors shadow-lg text-sm sm:text-base"
          >
            Submit Your Ad — $12/yr
          </Link>
        </div>
      </div>
    </header>
  );
}
