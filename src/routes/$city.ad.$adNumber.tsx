import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdByNumber } from "@/lib/ads.functions";

// City-scoped canonical URL for an ad. Since the ad already knows its city,
// this route just redirects to the flat /ad/$adNumber page (which brands
// itself with the ad's city) — but only when the URL city matches the ad's
// city, so /bonita/ad/2999 doesn't silently show a National City ad.
export const Route = createFileRoute("/$city/ad/$adNumber")({
  loader: async ({ params }) => {
    const n = Number(params.adNumber);
    if (!Number.isFinite(n) || n <= 0) {
      throw redirect({ to: "/$city", params: { city: params.city } });
    }
    const ad = await getAdByNumber({ data: { ad_number: n } });
    if (!ad) throw redirect({ to: "/$city", params: { city: params.city } });
    // If URL city doesn't match ad's real city, send to ad's real URL.
    throw redirect({ to: "/ad/$adNumber", params: { adNumber: String(ad.ad_number ?? n) } });
  },
});
