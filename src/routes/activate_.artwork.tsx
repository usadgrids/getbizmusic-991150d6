import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lookupActivationArtworkToken, saveActivationArtwork } from "@/lib/activation.functions";

export const Route = createFileRoute("/activate_/artwork")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Upload Your Ad Image — Get Biz Music" },
      { name: "description", content: "Upload the ad image for your GetBizMusic listing using your private upload link." },
      { property: "og:title", content: "Upload Your Ad Image — Get Biz Music" },
      { property: "og:description", content: "Send us your ad artwork to finish activating your GetBizMusic listing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtworkUploadPage,
});

function ArtworkUploadPage() {
  const search = Route.useSearch();
  const lookupFn = useServerFn(lookupActivationArtworkToken);
  const saveFn = useServerFn(saveActivationArtwork);

  const [state, setState] = useState<{ loading: boolean; found: boolean; businessName?: string; code?: string; uploaded?: boolean }>({
    loading: true,
    found: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!search.token) {
      setState({ loading: false, found: false });
      return;
    }
    (async () => {
      try {
        const res = await lookupFn({ data: { token: search.token! } });
        setState({ loading: false, ...res });
      } catch {
        setState({ loading: false, found: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.token]);

  const upload = async () => {
    if (!file || !search.token || !state.code) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be 10MB or smaller.");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `activation/${state.code}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ad-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const res = await saveFn({ data: { token: search.token, imagePath: path } });
      if (!res.ok) throw new Error(res.error);
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        {state.loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
            <Loader2 className="animate-spin" size={18} /> Loading your upload link…
          </div>
        ) : !state.found ? (
          <>
            <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">This upload link isn't valid</h1>
            <p className="text-sm text-gray-600 mt-2">
              Please use the private link from your GetBizMusic email, or reply to that email and we'll send a new one.
            </p>
          </>
        ) : done || state.uploaded ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={44} />
            <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">We've got your ad image</h1>
            <p className="text-sm text-gray-600 mt-3">
              Our team is reviewing it now. You'll get an email the moment your ad is live on GetBizMusic.com.
            </p>
            <Link to="/" className="inline-block mt-6 bg-[#0F2A4A] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#163864]">
              Listen to the music &amp; view ads
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-[#0F2A4A]">Upload your ad image</h1>
            <p className="text-sm text-gray-600 mt-2">
              {state.businessName ? `For ${state.businessName}. ` : ""}
              PNG, JPG or WEBP up to 10MB. We accept professional-grade ad images at our discretion.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-5 block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#0F2A4A] file:text-white file:text-xs file:font-semibold"
            />
            <button
              onClick={upload}
              disabled={!file || busy}
              className="mt-5 w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-3 rounded-lg hover:bg-[#e0b266] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {busy ? <><Loader2 className="animate-spin" size={16} /> Uploading…</> : <><Upload size={16} /> Send my ad image</>}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
