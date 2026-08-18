import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Unlock } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import { BusinessClaimSearch } from "@/components/biz/BusinessClaimSearch";
import { ActivationCodeBar } from "@/components/biz/ActivationCodeBar";
import { getAdsByCategory } from "@/lib/ads.functions";
import {
  DIRECTORY_CATEGORY_SLUGS,
  DIRECTORY_CATEGORIES,
  type DirectoryCategory,
} from "@/lib/directory-categories";
import { DIRECTORY_CATEGORY_UI } from "@/lib/directory-category-ui";
import homeHero from "@/assets/SD-Business-3.png.asset.json";



const ALL_INDUSTRIES = DIRECTORY_CATEGORY_SLUGS.flatMap((s) => DIRECTORY_CATEGORIES[s].industries);

/** Decorative tiled mosaic of live advertiser graphics behind the claim panel. */
function AdTileBackground() {
  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useQuery({
    queryKey: ["home-tile-ads"],
    queryFn: () => fetchAds({ data: { industries: ALL_INDUSTRIES, seed_key: "home-tiles" } }),
    staleTime: 5 * 60 * 1000,
  });

  // Build the mosaic once per ad payload (memoised) — recomputing the shuffle
  // on every render forced all tiles to remount and made the page feel slow.
  const tiles = useMemo(() => {
    const showcase = DIRECTORY_CATEGORY_SLUGS.flatMap(
      (s) => DIRECTORY_CATEGORY_UI[s].showcaseAds,
    );
    const pooled = [...ads, ...showcase];
    if (!pooled.length) return [];

    // De-duplicate by image so the mosaic shows many *different* ads.
    const byImage = new Map<string, (typeof pooled)[number]>();
    for (const ad of pooled) {
      const url = ad.image_url ?? ad.id;
      if (!byImage.has(url)) byImage.set(url, ad);
    }
    const shuffled = Array.from(byImage.values());
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 18 tiles is enough to fill the panel backdrop while keeping image
    // decoding cheap; no two horizontally-adjacent tiles repeat.
    const imgUrl = (ad: (typeof pooled)[number]) => ad.image_url ?? ad.id;
    const out: (typeof pooled)[number][] = [];
    let lastUrl: string | null = null;
    let pool = [...shuffled];
    for (let i = 0; i < 18; i++) {
      let idx = pool.findIndex((a) => imgUrl(a) !== lastUrl);
      if (idx === -1) idx = 0;
      const ad = pool[idx];
      out.push(ad);
      lastUrl = imgUrl(ad);
      pool.splice(idx, 1);
      if (pool.length === 0) pool = [...shuffled];
    }
    return out;
  }, [ads]);

  if (!tiles.length) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="grid h-full w-full grid-cols-3 gap-1 opacity-50 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((ad, i) => (
          <img
            key={`${ad.id}-${i}`}
            src={ad.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] h-full w-full rounded-md object-cover"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F2A4A]/35 via-[#0F2A4A]/30 to-[#0F2A4A]/35" />
    </div>
  );
}


const OG_IMAGE_URL =
  "https://www.getbizmusic.com/__l5e/assets-v1/74f08fd4-9ee2-41dc-b8b1-fbc723051789/getbizmusic-og-image.png";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Biz Music — Find & Claim Your San Diego County Business" },
      {
        name: "description",
        content:
          "Is your San Diego County business visible on ChatGPT and AI search engines? Find and claim your business listing — get a free AI Visibility Audit and a free professional ad design.",
      },
      { property: "og:title", content: "Get Biz Music — Find & Claim Your San Diego County Business" },
      {
        property: "og:description",
        content:
          "Is your San Diego County business visible on ChatGPT and AI search engines? Find and claim your listing — free AI Visibility Audit and ad design.",
      },
      { property: "og:url", content: "https://getbizmusic.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:width", content: "1254" },
      { property: "og:image:height", content: "1254" },
      { property: "og:image:alt", content: "Is your San Diego County business visible on ChatGPT? — GetBizMusic.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/" }],
  }),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState<DirectoryCategory>("food");
  const [showActivation, setShowActivation] = useState(false);
  const navigate = useNavigate();



  return (
    <div className="mx-auto flex min-h-screen w-full max-w-full min-w-0 flex-col overflow-x-hidden bg-[#0F2A4A] text-white">
      {/* Brand anchor — visible, not a clickable nav item */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-3 text-[#D4A24C]">
        <Building2 size={20} className="text-[#D4A24C]" aria-hidden />
        <span className="font-['Sora'] text-sm font-bold tracking-[0.2em] uppercase">
          Get Biz Music — AI Business Alliance
        </span>
      </div>

      {/* Hero header image */}
      <header className="relative w-full max-w-full min-w-0 overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-2 sm:px-4">
          <img
            src={homeHero.url}
            alt="Is your San Diego County business visible on ChatGPT and other AI search engines? GetBizMusic.com"
            className="block w-full h-auto rounded-xl"
          />
        </div>
      </header>

      {/* Centerpiece: the Find & Claim Your Business panel */}
      <main className="relative mx-auto flex w-full max-w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
        <AdTileBackground />
        <div className="relative mx-auto w-full max-w-3xl min-w-0">
          {/* Premium panel wrapping the reused widget */}
          <div className="relative overflow-hidden rounded-3xl border border-[#D4A24C]/40 bg-gradient-to-br from-[#16213e] via-[#0F2A4A] to-[#0a0e1a] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
            {/* Thin gold accent line at top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A24C] to-transparent" />

            {/* Invitation quote */}
            <div className="px-1 sm:px-4">
              <p className="text-center text-[15px] font-semibold leading-snug text-[#d4af37] sm:text-xl md:text-2xl">
                &ldquo;We&rsquo;re only extending by-invitation AI visibility optimization access to a limited number of San Diego County businesses this year.&rdquo;
              </p>

              {/* Signature block */}
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <img
                  src="https://getbizmusic.com/__l5e/assets-v1/c1b84ad5-8673-482d-b654-e488045db784/ralph-posadas-headshot.png"
                  alt="Ralph T. Posadas"
                  loading="lazy"
                  className="h-20 w-20 rounded-full border border-[#D4A24C]/70 object-cover sm:h-28 sm:w-28"
                />
                <div className="text-center sm:text-left">
                  <p className="font-['Mr_De_Haviland'] text-3xl leading-tight text-white sm:text-4xl">
                    Ralph T. Posadas
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60 sm:text-xs">
                    GetBizMusic AI Business Alliance, President
                  </p>
                </div>
              </div>
            </div>

            {/* The reused Find & Claim widget — not rebuilt, just mounted */}
            <div className="mt-6 [&>section]:mt-0 [&>section]:shadow-none">
              <BusinessClaimSearch category={category} />
            </div>

            {/* Secondary, clearly separated activation-code entry */}
            <div className="mt-12 border-t-2 border-dashed border-white/15 pt-8 text-center">
              {!showActivation ? (
                <button
                  type="button"
                  onClick={() => setShowActivation(true)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-white/70 underline underline-offset-4 transition-colors hover:text-[#D4A24C]"
                >
                  <Unlock size={14} aria-hidden />
                  Already received an ADVERTISEMENT Proposal? Enter your ACTIVATION CODE here.
                </button>
              ) : (
                <div className="[&>section]:mt-0">
                  <ActivationCodeBar
                    proof={null}
                    onProof={(proof) => {
                      if (proof) void navigate({ to: "/activate", search: { code: proof.code } });
                    }}
                  />
                  <p className="mx-auto mt-3 max-w-xl text-xs text-white/60">
                    Already received a flyer or been personally onboarded? Enter your Activation
                    Code here to view your ready-made ad.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowActivation(false)}
                    className="mt-3 text-xs text-white/50 underline underline-offset-4 hover:text-white/80"
                  >
                    Hide
                  </button>
                </div>
              )}
            </div>


          </div>
        </div>
      </main>

      <BizFooter />
    </div>
  );
}
