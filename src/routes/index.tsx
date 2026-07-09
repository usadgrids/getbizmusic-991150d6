import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveCities } from "@/lib/cities.functions";
import { BizFooter } from "@/components/biz/BizFooter";
import { lookupZip, zipsForCity } from "@/lib/us-zips";

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
  const filtered = cities.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">

      {/* Hero */}
      <section className="bg-[#0F2A4A] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:py-20 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#FFD700] font-semibold">
            Get Biz Music
          </p>
          <h1 className="mt-3 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Local business ads<br className="sm:hidden" /> in your city
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-2xl mx-auto">
            Pick your city to see who's advertising — or list your own business for as little as $12/year.
          </p>

          <div className="mt-8 max-w-xl mx-auto">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your city…"
              className="w-full rounded-full border border-white/20 bg-white/10 backdrop-blur px-5 py-3 text-base sm:text-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              aria-label="Search cities"
            />
          </div>
        </div>
      </section>

      {/* City grid */}
      <main className="w-full max-w-[1400px] mx-auto px-4 py-10 sm:py-14">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">
          {filtered.length} active {filtered.length === 1 ? "city" : "cities"}
        </h2>

        {filtered.length === 0 ? (
          <p className="text-gray-600">No cities match "{q}". Try the request form below.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/$city"
                params={{ city: c.slug }}
                className="group block rounded-2xl bg-white p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      {c.state}
                    </div>
                    <div className="mt-1 text-xl font-bold text-[#0F2A4A] group-hover:text-blue-600">
                      {c.name}
                    </div>
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

        {/* Request city */}
        <RequestCity />
      </main>

      <BizFooter />
    </div>
  );
}

function RequestCity() {
  const submit = useServerFn(submitCityRequest);
  const [cityName, setCityName] = useState("");
  const [state, setState] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cityName.trim()) return;
    setStatus("sending");
    setErr(null);
    try {
      await submit({
        data: {
          city_name: cityName.trim(),
          state: state.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
      setStatus("sent");
      setCityName("");
      setState("");
      setEmail("");
    } catch (e2) {
      setStatus("error");
      setErr(e2 instanceof Error ? e2.message : "Failed to send");
    }
  }

  return (
    <section className="mt-16 rounded-3xl bg-gradient-to-br from-[#0F2A4A] to-[#1a3a6b] text-white p-8 sm:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-2xl sm:text-3xl font-bold">Don't see your city?</h3>
        <p className="mt-2 text-white/80">
          Tell us where you are — we're launching new cities every week.
        </p>
        {status === "sent" ? (
          <div className="mt-6 rounded-xl bg-green-500/20 border border-green-400 p-4 text-green-100">
            Thanks! We'll let you know when your city goes live.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="City name"
              className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              aria-label="City name"
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State (e.g. CA)"
              className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              aria-label="State"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              aria-label="Email"
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-[#FFD700] px-8 py-3 font-bold text-[#0F2A4A] hover:bg-[#FFC300] disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Request my city"}
              </button>
              {err && <div className="mt-3 text-red-200 text-sm">{err}</div>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
