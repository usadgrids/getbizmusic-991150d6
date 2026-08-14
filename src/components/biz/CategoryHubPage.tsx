import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getAdsByCategory, type PublicAd } from "@/lib/ads.functions";
import { listDirectoryPlaces } from "@/lib/directory.functions";
import type { ActivationProof } from "@/lib/activation.functions";
import { BizHero } from "@/components/biz/BizHero";
import { BizFooter } from "@/components/biz/BizFooter";
import { AdSlider } from "@/components/biz/AdSlider";
import { ActivationCodeBar } from "@/components/biz/ActivationCodeBar";
import { DirectoryList } from "@/components/biz/DirectoryList";
import { PageShareBar } from "@/components/biz/PageShareBar";
import { DIRECTORY_CATEGORIES, type DirectoryCategory } from "@/lib/directory-categories";
import { DIRECTORY_CATEGORY_UI } from "@/lib/directory-category-ui";

/**
 * Master template for every BizMusic Knowledge Graph category hub
 * (/food, /beauty, and any category added to the registry).
 */
export function CategoryHubPage({
  category,
  initialCode,
}: {
  category: DirectoryCategory;
  initialCode?: string;
}) {
  const config = DIRECTORY_CATEGORIES[category];
  const ui = DIRECTORY_CATEGORY_UI[category];
  const EmptyIcon = ui.icon;

  const fetchAds = useServerFn(getAdsByCategory);
  const { data: ads = [] } = useSuspenseQuery({
    queryKey: ["category-ads", category],
    queryFn: () => fetchAds({ data: { industries: config.industries, seed_key: category } }),
  });
  const fetchPlaces = useServerFn(listDirectoryPlaces);
  const { data: directory } = useSuspenseQuery({
    queryKey: ["directory-places", category],
    queryFn: () => fetchPlaces({ data: { category } }),
  });

  const [proof, setProof] = useState<ActivationProof | null>(null);
  // Bumped on every code submission so re-entering the same code still snaps the slider back.
  const [focusNonce, setFocusNonce] = useState(0);
  const handleProof = (next: ActivationProof | null) => {
    setProof(next);
    if (next) setFocusNonce((n) => n + 1);
  };

  // PRIVATE PREVIEW ONLY: this slide exists purely in this visitor's browser after they
  // entered their own activation code. It is never fetched by, or rendered for, anyone else.
  const isLivePreview = proof?.status === "activated" || proof?.status === "live";
  const proofSlide: PublicAd | null =
    proof && proof.imageUrl && !isLivePreview
      ? {
          id: `activation-${proof.code}`,
          ad_number: null,
          business_name: proof.businessName,
          website_url: proof.websiteUrl,
          youtube_url: proof.youtubeUrl,
          tagline: proof.tagline,
          industry: proof.industry,
          ad_type: proof.adType === "slider_10" ? "slider_10" : "image_5",
          image_url: proof.imageUrl,
          duration_seconds: proof.adType === "slider_10" ? 10 : 7,
        }
      : null;
  const slides = [...(proofSlide ? [proofSlide] : []), ...ui.showcaseAds, ...ads];

  return (
    <div className="min-h-screen bg-[#f5f6f8] overflow-x-hidden">
      <BizHero
        cityName={config.heroTitle}
        state="CA"
        imageUrl={ui.heroImage}
        imageAlt={config.heroAlt}
      />
      <main className="w-full max-w-[1800px] mx-auto px-2 sm:px-4 pb-20 sm:pb-16 min-w-0">
        <h1 className="sr-only">{config.srHeading}</h1>

        <div className="mx-auto w-full" style={{ maxWidth: "min(100%, 1400px, calc(90svh * 4 / 3))" }}>
          <ActivationCodeBar initialCode={initialCode} proof={proof} onProof={handleProof} />
        </div>

        {proofSlide && (
          <div className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-[#D4A24C]/50 bg-[#FFF8E8] px-4 py-2.5 text-center text-xs font-semibold text-[#7a5410]">
            Private preview — only you can see this ad. It goes public after payment and activation.
          </div>
        )}

        {slides.length > 0 ? (
          <AdSlider
            ads={slides}
            title={config.sliderTitle}
            featured
            hideAdShareBar
            focusAdId={proofSlide?.id ?? null}
            focusNonce={focusNonce}
            belowShareBar={
              <>
                <PageShareBar
                  url={`https://www.getbizmusic.com/${category}`}
                  title={config.heroTitle}
                  text={config.srHeading}
                  label={`Share ${config.heroTitle}`}
                />
                {proofSlide ? (
                <div className="mt-4 mx-auto w-full max-w-3xl rounded-2xl border-2 border-[#D4A24C] bg-gradient-to-br from-[#0F2A4A] via-[#153a66] to-[#0F2A4A] px-5 py-6 sm:px-8 sm:py-7 text-center text-white shadow-md">
                  {isLivePreview || proof?.paid ? (
                    <>
                      <CheckCircle2 className="mx-auto mb-2 text-[#F4C430]" size={26} />
                      <h2 className="text-lg sm:text-xl font-bold mb-1">
                        Your listing is already live
                      </h2>
                      <p className="text-sm text-white/80">
                        This ad is active and running in the rotation. No further action is needed.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg sm:text-xl font-bold mb-1">
                        That's your ad in the spotlight — ready to go live?
                      </h2>
                      <p className="text-sm text-white/80 mb-1">
                        {proof?.priceNote
                          ? `Activation: ${proof.priceNote}`
                          : proof?.priceCents
                            ? `Activation: $${(proof.priceCents / 100).toFixed(2)}`
                            : "Activate your listing to make this ad public."}
                      </p>
                      <p className="text-xs text-white/60 mb-4">
                        It stays a private preview until payment and activation are complete.
                      </p>
                      <Link
                        to="/$city/activate"
                        params={{ city: category }}
                        search={{ code: proof!.code }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-7 py-3 text-sm font-bold text-[#0F2A4A] transition-transform hover:scale-105 hover:bg-[#e0b566] shadow-sm"
                      >
                        Review & Activate My Listing
                        <ArrowRight size={16} />
                      </Link>
                    </>
                  )}
                </div>
                ) : null}
              </>
            }
          />
        ) : (
          <section className="mt-8 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
            <EmptyIcon className="mx-auto mb-3 text-[#D4A24C]" size={28} />
            <h2 className="text-lg font-bold text-[#0F2A4A]">{config.emptyHeadline}</h2>
            <p className="mt-2 text-sm text-gray-600">{config.emptyBody}</p>
          </section>
        )}

        <DirectoryList category={category} places={directory.places} />
      </main>

      <BizFooter />
    </div>
  );
}
