/**
 * One-way sync: publishes GetBizMusic ads to WINWINCAST as curated links.
 *
 * Server-only. Never blocks the admin action — every call swallows errors and
 * logs them, so a WINWINCAST outage can't fail an ad publish.
 */

const INGEST_URL = "https://winwincast.lovable.app/api/public/ingest/getbizmusic";
const SITE_URL = "https://getbizmusic.com";

export type WinWinCastAd = {
  adNumber: number | null;
  businessName: string;
  tagline?: string | null;
  cityName?: string | null;
  websiteUrl?: string | null;
};

function secret() {
  return process.env["WINWINCAST_SYNC_SECRET"] ?? "";
}

function externalRef(adNumber: number) {
  return `getbizmusic:ad:${adNumber}`;
}

function buildPayload(ad: WinWinCastAd, adNumber: number) {
  const description =
    ad.tagline?.trim() ||
    `Now streaming on GetBizMusic${ad.cityName ? ` in ${ad.cityName}` : ""}.`;
  return {
    external_ref: externalRef(adNumber),
    url: `${SITE_URL}/ad/${adNumber}`,
    title: ad.businessName || "Local Business",
    description,
    image_url: `${SITE_URL}/api/public/ad-image/${adNumber}`,
    category: "local_business",
    country: "US",
  };
}

async function call(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const key = secret();
  if (!key) {
    console.warn("[winwincast-sync] WINWINCAST_SYNC_SECRET missing — skipping sync");
    return { ok: false as const, reason: "missing_secret" };
  }
  try {
    const res = await fetch(INGEST_URL, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[winwincast-sync] ${method} failed [${res.status}]: ${text}`);
      return { ok: false as const, reason: `http_${res.status}` };
    }
    return { ok: true as const };
  } catch (err) {
    console.error("[winwincast-sync] request error:", err);
    return { ok: false as const, reason: "network_error" };
  }
}

/** Publish a newly created manual ad. Returns true when WINWINCAST accepted it. */
export async function pushAd(ad: WinWinCastAd): Promise<boolean> {
  if (!ad.adNumber) return false;
  const res = await call("POST", buildPayload(ad, ad.adNumber));
  return res.ok;
}

/** Update an already-synced ad. */
export async function updateAdOnWinWinCast(ad: WinWinCastAd): Promise<boolean> {
  if (!ad.adNumber) return false;
  const res = await call("PATCH", buildPayload(ad, ad.adNumber));
  return res.ok;
}

/** Remove a synced ad's link. */
export async function removeAdFromWinWinCast(adNumber: number | null): Promise<boolean> {
  if (!adNumber) return false;
  const res = await call("DELETE", { external_ref: externalRef(adNumber) });
  return res.ok;
}
