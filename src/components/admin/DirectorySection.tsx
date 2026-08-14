import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, RefreshCw, Trash2, ExternalLink, Search } from "lucide-react";
import {
  adminListDirectory,
  adminListResearchableAds,
  adminResearchAd,
  adminRefreshTopicPages,
  adminUpdatePlace,
  adminDeletePlace,
} from "@/lib/directory.functions";
import type { DirectoryCategory } from "@/lib/directory-categories";

export function DirectorySection() {
  const listFn = useServerFn(adminListDirectory);
  const pendingFn = useServerFn(adminListResearchableAds);
  const researchFn = useServerFn(adminResearchAd);
  const topicsFn = useServerFn(adminRefreshTopicPages);
  const updateFn = useServerFn(adminUpdatePlace);
  const deleteFn = useServerFn(adminDeletePlace);

  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const directory = useQuery({ queryKey: ["admin-directory"], queryFn: () => listFn({}) });
  const pending = useQuery({ queryKey: ["admin-directory-pending"], queryFn: () => pendingFn({}) });

  const refresh = () => {
    void directory.refetch();
    void pending.refetch();
  };

  const runResearch = async (adId: string, category: DirectoryCategory) => {
    setBusy(adId);
    try {
      const res = await researchFn({ data: { adId, category } });
      if (res.ok) toast.success("Research complete — listing updated.");
      else toast.error(res.error ?? "Research failed.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Research failed.");
    } finally {
      setBusy(null);
    }
  };

  const rebuildTopics = async () => {
    setBusy("topics");
    try {
      const [food, beauty] = await Promise.all([
        topicsFn({ data: { category: "food" } }),
        topicsFn({ data: { category: "beauty" } }),
      ]);
      toast.success(`Answer pages rebuilt: ${food.written + beauty.written} topics.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Topic rebuild failed.");
    } finally {
      setBusy(null);
    }
  };

  const togglePublish = async (id: string, status: string) => {
    setBusy(id);
    try {
      await updateFn({
        data: { id, patch: { status: status === "published" ? "draft" : "published" } },
      });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete the knowledge-base page for ${name}? This cannot be undone.`)) return;
    setBusy(id);
    try {
      await deleteFn({ data: { id } });
      toast.success("Listing deleted.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };

  const places = (directory.data?.places ?? []).filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true,
  );
  const runs = directory.data?.runs ?? [];
  const pendingAds = pending.data?.ads ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-card-foreground">
          <BookOpen className="h-5 w-5" aria-hidden /> BizMusic Knowledge Graph
        </h2>

        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Reload
        </button>
        <button
          type="button"
          onClick={rebuildTopics}
          disabled={busy === "topics"}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {busy === "topics" ? "Rebuilding…" : "Rebuild answer pages"}
        </button>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        Researched listings published at /food/&lt;slug&gt; and /beauty/&lt;slug&gt; with schema markup
        so ChatGPT, Perplexity and Google AI cite getbizmusic.com.
      </p>

      {/* Ads without a knowledge-base page yet */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live ads without a listing ({pendingAds.length})
        </h3>
        <div className="mt-2 space-y-2">
          {pendingAds.map((ad) => (
            <div
              key={ad.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{ad.business_name}</span>{" "}
                <span className="text-muted-foreground">· {ad.category}</span>
              </span>
              <button
                type="button"
                disabled={busy === ad.id}
                onClick={() => runResearch(ad.id, ad.category as DirectoryCategory)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" aria-hidden />
                {busy === ad.id ? "Researching…" : "Research now"}
              </button>
            </div>
          ))}
          {!pendingAds.length && (
            <p className="text-sm text-muted-foreground">Every eligible live ad has a listing.</p>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Listings ({places.length})
          </h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Business</th>
                <th className="py-2">Category</th>
                <th className="py-2">Status</th>
                <th className="py-2">Last verified</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-2">
                    <a
                      href={`/${p.category}/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {p.name} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                    <div className="text-xs text-muted-foreground">
                      {[p.city, p.state].filter(Boolean).join(", ")}
                    </div>
                  </td>
                  <td className="py-2 capitalize">{p.category}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        p.status === "published"
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : "border-gray-300 bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {p.last_crawled_at ? new Date(p.last_crawled_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => togglePublish(p.id, p.status)}
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === p.ad_id}
                        onClick={() => runResearch(p.ad_id, p.category as DirectoryCategory)}
                        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Re-crawl
                      </button>
                      <button
                        type="button"
                        disabled={busy === p.id}
                        onClick={() => remove(p.id, p.name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!places.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No listings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crawl runs */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent research runs
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {runs.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-2">
              <span>{new Date(r.started_at).toLocaleString()}</span>
              <span className="capitalize">· {r.category}</span>
              <span>· {r.triggered_by}</span>
              <span
                className={
                  r.status === "completed"
                    ? "text-emerald-700"
                    : r.status === "failed"
                      ? "text-red-700"
                      : ""
                }
              >
                · {r.status}
              </span>
              {r.errors && <span className="text-red-700">· {r.errors}</span>}
            </li>
          ))}
          {!runs.length && <li>No runs yet.</li>}
        </ul>
      </div>
    </section>
  );
}
