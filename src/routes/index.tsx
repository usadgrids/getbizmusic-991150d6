import { createFileRoute, Link } from "@tanstack/react-router";
import { Music, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveCities } from "@/lib/cities.functions";
import { BizFooter } from "@/components/biz/BizFooter";
import { lookupZip, zipsForCity } from "@/lib/us-zips";
import { RequestCityForm } from "@/components/biz/RequestCityForm";

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
    await context.queryClient.ensureQueryData({
      queryKey: ["active-cities"],
      queryFn: () => getActiveCities(),
    });
  },
  component: Index,
});

function Index() {
  const fetchCities = useServerFn(getActiveCities);
  const { data: cities = [] } = useSuspenseQuery({
    queryKey: ["active-cities"],
    queryFn: () => fetchCities(),
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

  const filtered = cities.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    if (zipMatch) {
      return c.name.toLowerCase() === zipMatch.city.toLowerCase() &&
             c.state.toUpperCase() === zipMatch.stateCode.toUpperCase();
    }
    if (/^\d+$/.test(s)) return false; // partial zip, no match yet
    return c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s);
  });

  const zipHasNoActiveCity =
    zipMatch !== null && filtered.length === 0 && /^\d{5}$/.test(q.trim());

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">

      {/* Hero */}
      <section className="bg-[#0F2A4A] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:py-20 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#FFD700] font-semibold">
            Get Biz Music
          </p>
          <h1 className="mt-3 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Imagine! Listening To Music & Viewing<br />
            Business Ads In Your City?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
            Pick your city to see who's advertising — or list your own business for as little as $12/year.
          </p>

          <div className="mt-8 max-w-xl mx-auto">
            <input
              type="search"
              inputMode="numeric"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Enter Your Zip Code"
              className="w-full rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-3 text-base sm:text-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              aria-label="Search cities by ZIP code"
            />
            {zipMatch && (
              <p className="mt-2 text-sm text-white/70">
                ZIP {q.trim()} → {zipMatch.city}, {zipMatch.stateCode}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* City grid */}
      <main className="w-full max-w-[1400px] mx-auto px-4 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0F2A4A] text-[#FFD700] shadow-md">
            <Music className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </div>
          <h2 className="text-center text-xl sm:text-3xl font-black tracking-tight text-[#0F2A4A]">
            Listen To Music & View Ads In These Cities
          </h2>
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFD700] text-[#0F2A4A] shadow-md">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          </div>
        </div>

        {zipHasNoActiveCity && zipMatch ? (
          <RequestCityForm city={zipMatch.city} stateCode={zipMatch.stateCode} zip={q.trim()} />
        ) : filtered.length === 0 ? (
          <p className="text-gray-600">No cities match "{q}".</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/$city"
                params={{ city: c.slug }}
                className="group w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] xl:w-[calc(25%-0.75rem)] max-w-sm rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {c.state}
                    </div>
                    <div className="mt-1 text-xl font-bold text-[#0F2A4A] group-hover:text-blue-600">
                      {c.name}
                    </div>
                    <CityZips city={c.name} state={c.state} />
                  </div>
                  <span className="text-[#FFB300] group-hover:translate-x-1 transition-transform text-xl">→</span>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {c.ad_count} active {c.ad_count === 1 ? "ad" : "ads"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BizFooter />
    </div>
  );
}

function CityZips({ city, state }: { city: string; state: string }) {
  const [zips, setZips] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    zipsForCity(city, state).then((r) => { if (!cancelled) setZips(r); });
    return () => { cancelled = true; };
  }, [city, state]);
  if (zips.length === 0) return null;
  const shown = zips.slice(0, 4);
  const extra = zips.length - shown.length;
  return (
    <div className="mt-1 text-xs text-gray-500 font-mono">
      {shown.join(", ")}{extra > 0 ? ` +${extra} more` : ""}
    </div>
  );
}

