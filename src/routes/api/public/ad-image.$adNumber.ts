import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://www.getbizmusic.com";
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800";

type ImagePayload = {
  bytes: ArrayBuffer;
  contentType: string;
};

function imageHeaders(contentType: string, adNumber: number) {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return {
    "Content-Type": contentType,
    "Cache-Control": CACHE_CONTROL,
    "Access-Control-Allow-Origin": "*",
    "Content-Disposition": `inline; filename="ad-${adNumber}.${ext}"`,
    "X-Content-Type-Options": "nosniff",
  };
}

async function readRemoteImage(src: string): Promise<ImagePayload | null> {
  const res = await fetch(src, {
    headers: { "User-Agent": "GetBizMusic social image fetcher" },
  });
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
  if (!contentType.startsWith("image/")) return null;
  return { bytes: await res.arrayBuffer(), contentType };
}

async function loadAdImage(adNumber: number): Promise<ImagePayload | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("ads")
    .select("image_url")
    .eq("ad_number", adNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const imageUrl = (row as { image_url?: string | null } | null)?.image_url?.trim();
  if (!imageUrl) return null;

  if (/^https?:\/\//i.test(imageUrl)) return readRemoteImage(imageUrl);
  if (imageUrl.startsWith("/")) return readRemoteImage(`${SITE}${imageUrl}`);

  const { data, error: downloadError } = await supabaseAdmin.storage
    .from("ad-uploads")
    .download(imageUrl);
  if (downloadError || !data) return null;
  return {
    bytes: await data.arrayBuffer(),
    contentType: data.type || "image/jpeg",
  };
}

async function serveAdImage(adNumberParam: string, includeBody: boolean) {
  const adNumber = Number(adNumberParam);
  if (!Number.isFinite(adNumber) || adNumber <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const image = await loadAdImage(adNumber);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(includeBody ? image.bytes : null, {
    status: 200,
    headers: imageHeaders(image.contentType, adNumber),
  });
}

export const Route = createFileRoute("/api/public/ad-image/$adNumber")({
  server: {
    handlers: {
      GET: async ({ params }) => serveAdImage(params.adNumber, true),
      HEAD: async ({ params }) => serveAdImage(params.adNumber, false),
    },
  },
});