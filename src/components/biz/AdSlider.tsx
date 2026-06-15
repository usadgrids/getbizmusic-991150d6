import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import type { PublicAd } from "@/lib/ads.functions";

interface Props {
  ads: PublicAd[];
  title: string;
  featured?: boolean;
}

export function AdSlider({ ads, title, featured = false }: Props) {
  const [idx, setIdx] = useState(0);
  const current = ads[idx];

  // Auto-advance using the per-ad duration
  useEffect(() => {
    if (ads.length <= 1 || !current) return;
    const id = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ads.length);
    }, current.duration_seconds * 1000);
    return () => window.clearTimeout(id);
  }, [idx, ads.length, current]);

  if (ads.length === 0) {
    return (
      <section className="my-8">
        <h2 className="font-serif text-xl text-[#0F2A4A] font-bold mb-3">{title}</h2>
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
          No ads here yet. <span className="text-[#0F2A4A] font-medium">Be the first to advertise!</span>
        </div>
      </section>
    );
  }

  const accent = featured ? "#D4A24C" : "#0F2A4A";
  const goPrev = () => setIdx((i) => (i === 0 ? ads.length - 1 : i - 1));
  const goNext = () => setIdx((i) => (i + 1) % ads.length);

  return (
    <section className="my-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-xl text-[#0F2A4A] font-bold flex items-center gap-2">
          {featured && <Sparkles size={18} className="text-[#D4A24C]" />}
          {title}
        </h2>
        <div className="text-xs text-gray-500">
          {idx + 1} / {ads.length} · {current.duration_seconds}s each
        </div>
      </div>
      <div
        className="relative rounded-2xl overflow-hidden shadow-xl bg-white"
        style={{ border: `3px solid ${accent}` }}
      >
        <a
          href={current.website_url || "#"}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block group"
        >
          <div className="relative aspect-[1200/628] bg-gray-100">
            <img
              src={current.image_url}
              alt={current.business_name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-white/70">
                    {current.industry}
                  </div>
                  <div className="font-serif text-lg sm:text-xl font-bold truncate">
                    {current.business_name}
                  </div>
                  {current.tagline && (
                    <div className="text-xs sm:text-sm text-white/85 truncate">
                      {current.tagline}
                    </div>
                  )}
                </div>
                {current.website_url && (
                  <div className="flex items-center gap-1 text-xs bg-[#D4A24C] text-[#0F2A4A] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap">
                    Visit <ExternalLink size={12} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
        {ads.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous ad"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-[#0F2A4A] rounded-full p-2 shadow"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next ad"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-[#0F2A4A] rounded-full p-2 shadow"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute top-3 right-3 flex gap-1">
              {ads.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Show ad ${i + 1}`}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: i === idx ? accent : "rgba(255,255,255,0.6)",
                    transform: i === idx ? "scale(1.4)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
