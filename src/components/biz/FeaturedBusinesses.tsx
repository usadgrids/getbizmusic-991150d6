import type { PublicAd } from "@/lib/ads.functions";
import { ExternalLink } from "lucide-react";

export function FeaturedBusinesses({ ads }: { ads: PublicAd[] }) {
  if (ads.length === 0) return null;
  return (
    <section id="featured" className="my-10">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F2A4A]">
          Featured Local Businesses
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Trusted by your neighbors. Tap any business to visit them.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={ad.website_url || "#"}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md hover:border-[#D4A24C] transition-all"
          >
            <div className="aspect-[1200/628] bg-gray-100 overflow-hidden">
              <img
                src={ad.image_url}
                alt={ad.business_name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-[#D4A24C] font-semibold">
                {ad.industry}
              </div>
              <div className="font-serif text-sm font-bold text-[#0F2A4A] truncate">
                {ad.business_name}
              </div>
              {ad.website_url && (
                <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
                  Visit <ExternalLink size={10} />
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
