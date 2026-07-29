import { createFileRoute, Link } from "@tanstack/react-router";
import { Music, Megaphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveCities, getCityBySlug } from "@/lib/cities.functions";
import { getActiveAds } from "@/lib/ads.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { MiniPlayer } from "@/components/biz/MiniPlayer";
import { lookupZip, zipsForCity } from "@/lib/us-zips";


const DEFAULT_CITY_SLUG = "san-diego-ca";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Biz Music — Local Business Ads in Your City" },
      {
        name: "description",
        content:
          "Discover and advertise local businesses with music streaming ads. Browse cities and find the best deals near you — $12/year intro offer.",
      },
      { property: "og:title", content: "Get Biz Music — Local Business Ads in Your City" },
      { property: "og:description", content: "Browse Get Biz Music cities and advertise your local business — $12/year intro offer." },
      { property: "og:url", content: "https://getbizmusic.com/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/" }],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["active-cities"],
        queryFn: () => getActiveCities(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["default-city", DEFAULT_CITY_SLUG],
        queryFn: () => getCityBySlug({ data: { slug: DEFAULT_CITY_SLUG } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["active-ads", DEFAULT_CITY_SLUG],
        queryFn: () => getActiveAds({ data: { city_slug: DEFAULT_CITY_SLUG } }),
      }),
    ]);
  },
  component: Index,
});

function Index() {
  const fetchCities = useServerFn(getActiveCities);
  const fetchCity = useServerFn(getCityBySlug);
  const fetchAds = useServerFn(getActiveAds);

  const { data: cities = [] } = useSuspenseQuery({
    queryKey: ["active-cities"],
    queryFn: () => fetchCities(),
  });
  const { data: defaultCity } = useQuery({
    queryKey: ["default-city", DEFAULT_CITY_SLUG],
    queryFn: () => fetchCity({ data: { slug: DEFAULT_CITY_SLUG } }),
  });
  const { data: ads = [] } = useQuery({
    queryKey: ["active-ads", DEFAULT_CITY_SLUG],
    queryFn: () => fetchAds({ data: { city_slug: DEFAULT_CITY_SLUG } }),
  });

  const [q, setQ] = useState("");
  const [zipMatch, setZipMatch] = useState<{ city: string; stateCode: string } | null>(null);

  useEffect(() => {
    const digits = q.trim();
    if (/^\d{5}$/.test(digits)) {
      let cancelled = false;
      lookupZip(digits).then((r) => { if (!cancelled) setZipMatch(r); });
      return () => { cancelled = true; };
    }
    setZipMatch(null);
  }, [q]);

  const citiesWithAds = cities.filter((c) => c.ad_count > 0);
  const filtered = citiesWithAds.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    if (zipMatch) {
      return c.name.toLowerCase() === zipMatch.city.toLowerCase() &&
             c.state.toUpperCase() === zipMatch.stateCode.toUpperCase();
    }
    if (/^\d+$/.test(s)) return false;
    return c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s);
  });

  const zipHasNoActiveCity =
    zipMatch !== null && filtered.length === 0 && /^\d{5}$/.test(q.trim());

  const cityName = defaultCity?.name ?? "San Diego";
  const cityState = defaultCity?.state ?? "CA";

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      {defaultCity && defaultCity.is_active ? (
        <>
          <BizHero cityName={cityName} state={cityState} />
          <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-10 min-w-0">
            <AdSlider
              ads={ads}
              title={`Featured ${cityName} Business of the Moment`}
              featured
            />
            <div
              className="mx-auto w-full"
              style={{ maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))" }}
            >
              <section className="mt-6 sm:mt-8 rounded-2xl bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-8 text-center text-white shadow-md">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#F4C430] mb-3">
                  <Sparkles size={14} />
                  {cityName} Business Spotlight
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Submit Your Business Novelty Ad
                </h2>
                <p className="text-sm text-white/80 max-w-2xl mx-auto mb-4">
                  Get your {cityName} business featured in the rotation above and reach local
                  listeners for just $12/year. Limited-time intro offer.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-6 py-2.5 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
                  >
                    Submit Your Ad
                    <Sparkles size={14} />
                  </Link>
                </div>
              </section>
            </div>
          </main>
        </>
      ) : null}

      {/* City switcher — shared module */}
      <section id="explore-cities" className="bg-[#0F2A4A] text-white scroll-mt-4">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:py-14 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#FFD700] font-semibold">
            Explore More Cities
          </p>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
            {defaultCity ? `Not in ${cityName}? Pick your city` : "Pick your city"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
            Enter your ZIP or search by city name. Don't see yours? You can still submit an ad — we'll
            create the city page automatically.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 text-[#FFD700]">
              <Music className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </div>
            <h3 className="text-center text-lg sm:text-2xl font-black tracking-tight text-white">
              Listen To Music &amp; View Ads In These Cities
            </h3>
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFD700] text-[#0F2A4A]">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 max-w-3xl mx-auto">
            <CityPickerPanel tone="dark" />
          </div>
        </div>
      </section>


      <BizFooter />
      {defaultCity && defaultCity.is_active ? <MiniPlayer /> : null}
    </div>
  );
}

