import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import repAsset from "@/assets/business-representative.png.asset.json";

export function BizHero() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#0F2A4A] via-[#163864] to-[#0F2A4A] text-white">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage:
          "radial-gradient(circle at 20% 30%, #D4A24C 0px, transparent 2px), radial-gradient(circle at 80% 70%, #D4A24C 0px, transparent 2px)",
        backgroundSize: "50px 50px",
      }} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-10 items-center">
          <div className="flex justify-center lg:justify-start order-1 lg:order-1">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4A24C]/20 rounded-full blur-3xl" />
              <div className="relative w-48 sm:w-56 lg:w-72 aspect-[3/4] rounded-2xl overflow-hidden ring-2 ring-[#D4A24C]/40 ring-offset-4 ring-offset-[#0F2A4A] shadow-2xl shadow-black/30">
                <img
                  src={repAsset.url}
                  alt="Professional business representative"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
          <div className="order-2 lg:order-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#D4A24C]/15 border border-[#D4A24C]/40 text-[#D4A24C] px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-3 sm:mb-4 break-words">
              <Sparkles size={14} className="shrink-0" /> USADGRIDS NOVELTY ADVERTISING - A WINALL MEDIA LLC CREATIVE.
            </div>
            <div className="mx-auto lg:mx-0 max-w-md lg:max-w-none mb-3 sm:mb-4 bg-[#D4A24C] text-[#0F2A4A] border-2 border-[#D4A24C] rounded-xl px-3 sm:px-4 py-2 text-sm sm:text-base lg:text-lg font-semibold shadow-lg break-words">
              NOW OPEN TO ALL Businesses Who Serve National City, CA.
            </div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-snug sm:leading-tight break-words">
              Novelty Business Ads With Music Streaming
              <br className="hidden lg:block" /> Gets Your Business <span className="text-[#D4A24C]">Seen</span>.
              <br className="hidden lg:block" /> Every Day. All Year Long for Just $12
            </h1>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base text-white/80 max-w-2xl mx-auto lg:mx-0 break-words">
              Get your business in front of National City visitors as they browse our novelty ads directory — with music keeping them right where you want them.
              <span className="block mt-1 sm:mt-2 text-[#D4A24C] font-semibold break-words">
                Really Special Introductory Limited Time Offer — $1/month, billed $12/year.
              </span>
              <span className="block break-words">Option to resubscribe at the end of your annual term. Prices may change.</span>
            </p>
            <div className="mt-4 sm:mt-5 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link
                to="/pricing"
                className="bg-[#D4A24C] text-[#0F2A4A] font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-md hover:bg-[#e0b266] transition-colors shadow-lg text-sm sm:text-base"
              >
                Get Listed — From $12/yr
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
