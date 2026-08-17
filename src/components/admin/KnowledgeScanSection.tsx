import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Radar, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteKnowledgeBusiness,
  adminGetKnowledgeBusiness,
  adminListKnowledgeBusinesses,
  adminRunKnowledgeScan,
  adminSetKnowledgeStatus,
  adminUpdateQaPair,
} from "@/lib/kg-scan.functions";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-600",
  B: "bg-lime-600",
  C: "bg-amber-500",
  D: "bg-orange-600",
  F: "bg-red-600",
};

function Bar({ label, got, max }: { label: string; got: number; max: number }) {
  const pct = Math.round((got / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-medium">
        <span>{label}</span>
        <span>
          {got} / {max}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function KnowledgeScanSection() {
  const qc = useQueryClient();
  const runFn = useServerFn(adminRunKnowledgeScan);
  const listFn = useServerFn(adminListKnowledgeBusinesses);
  const getFn = useServerFn(adminGetKnowledgeBusiness);
  const statusFn = useServerFn(adminSetKnowledgeStatus);
  const deleteFn = useServerFn(adminDeleteKnowledgeBusiness);
  const qaFn = useServerFn(adminUpdateQaPair);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [website, setWebsite] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["kg-businesses"], queryFn: () => listFn({}) });
  const detail = useQuery({
    queryKey: ["kg-business", openId],
    queryFn: () => getFn({ data: { id: openId as string } }),
    enabled: Boolean(openId),
  });

  const scan = useMutation({
    mutationFn: (vars: { businessId?: string | null }) =>
      runFn({
        data: {
          businessName: name.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          website: website.trim() || null,
          businessId: vars.businessId ?? null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Scored ${res.result.score.score}/100 (${res.result.score.grade})`);
      setOpenId(res.result.businessId);
      qc.invalidateQueries({ queryKey: ["kg-businesses"] });
      qc.invalidateQueries({ queryKey: ["kg-business", res.result.businessId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescan = useMutation({
    mutationFn: (b: { id: string; name: string; city: string | null; state: string | null; website: string | null }) =>
      runFn({
        data: {
          businessName: b.name,
          city: b.city,
          state: b.state,
          website: b.website,
          businessId: b.id,
        },
      }),
    onSuccess: () => {
      toast.success("Rescanned and rescored.");
      qc.invalidateQueries({ queryKey: ["kg-businesses"] });
      qc.invalidateQueries({ queryKey: ["kg-business", openId] });
    },
  });

  const rows = list.data?.businesses ?? [];
  const business = detail.data?.business as Record<string, unknown> | null | undefined;
  const facts = detail.data?.facts as Record<string, unknown> | null | undefined;
  const qa = (detail.data?.qa ?? []) as Array<Record<string, unknown>>;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Radar className="h-5 w-5 text-primary" aria-hidden />
        Knowledge Graph Scan & Score
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Gather → clean up → build schema → generate 10 buyer Q&amp;As → score (0-100 with letter grade) →
        review and publish. Everything saves as a draft first so you can edit before it goes live.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Business name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anytime Plumbing"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="National City"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">State</span>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-4">
          <span className="mb-1 block font-medium">Website (optional — found automatically when blank)</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={scan.isPending || name.trim().length < 2}
        onClick={() => scan.mutate({})}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Radar className="h-4 w-4" aria-hidden />
        {scan.isPending ? "Scanning (60-90s)…" : "Run full scan"}
      </button>

      {/* Review dashboard */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Business</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Biggest gap</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id as string} className="border-t border-border align-top">
                <td className="py-3 pr-3">
                  <button className="font-semibold underline-offset-2 hover:underline" onClick={() => setOpenId(b.id as string)}>
                    {b.name as string}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {[b.city, b.state].filter(Boolean).join(", ")}
                  </div>
                </td>
                <td className="py-3 pr-3 font-bold">{b.score ?? "—"}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                      GRADE_COLORS[(b.grade as string) ?? ""] ?? "bg-muted-foreground"
                    }`}
                  >
                    {(b.grade as string) ?? "?"}
                  </span>
                </td>
                <td className="py-3 pr-3 max-w-md text-xs text-muted-foreground">{b.weakest_summary as string}</td>
                <td className="py-3 pr-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase">{b.status as string}</span>
                    {b.needs_manual_validation ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" aria-hidden /> validate schema
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> schema ok
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      title="Rescan"
                      onClick={() =>
                        rescan.mutate({
                          id: b.id as string,
                          name: b.name as string,
                          city: (b.city as string) ?? null,
                          state: (b.state as string) ?? null,
                          website: (b.website as string) ?? null,
                        })
                      }
                      className="rounded-md border border-border p-1.5"
                    >
                      <RefreshCw className={`h-4 w-4 ${rescan.isPending ? "animate-spin" : ""}`} aria-hidden />
                    </button>
                    <button
                      title="Delete"
                      onClick={async () => {
                        if (!confirm(`Delete ${b.name as string}?`)) return;
                        await deleteFn({ data: { id: b.id as string } });
                        if (openId === b.id) setOpenId(null);
                        qc.invalidateQueries({ queryKey: ["kg-businesses"] });
                      }}
                      className="rounded-md border border-border p-1.5 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No scans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / review panel */}
      {business && (
        <div className="mt-8 rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{business["name"] as string}</h3>
              <p className="text-xs text-muted-foreground">
                Last scanned {business["last_scanned_at"] ? new Date(business["last_scanned_at"] as string).toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black">{business["score"] as number}/100</div>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-bold text-white ${
                  GRADE_COLORS[(business["grade"] as string) ?? ""] ?? "bg-muted-foreground"
                }`}
              >
                {business["grade"] as string}
              </span>
              <button
                onClick={async () => {
                  const next = business["status"] === "published" ? "draft" : "published";
                  await statusFn({ data: { id: business["id"] as string, status: next } });
                  qc.invalidateQueries({ queryKey: ["kg-businesses"] });
                  qc.invalidateQueries({ queryKey: ["kg-business", openId] });
                  toast.success(next === "published" ? "Published." : "Unpublished.");
                }}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                {business["status"] === "published" ? "Unpublish" : "Publish live"}
              </button>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-muted p-3 text-sm">{business["weakest_summary"] as string}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Bar label="Data Completeness" got={Number(business["score_completeness"])} max={25} />
            <Bar label="Schema Coverage" got={Number(business["score_schema"])} max={25} />
            <Bar label="Answer-ability" got={Number(business["score_answerability"])} max={30} />
            <Bar label="Review Signal" got={Number(business["score_reviews"])} max={20} />
          </div>

          {business["needs_manual_validation"] ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>JSON-LD needs manual validation before publishing.</strong> {business["schema_notes"] as string}
              </span>
            </p>
          ) : null}

          {facts && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide">Normalized facts</h4>
                <dl className="mt-2 space-y-1 text-sm">
                  <div><dt className="inline font-semibold">Hours: </dt><dd className="inline">{Object.entries((facts["hours"] as Record<string, string>) ?? {}).map(([d, h]) => `${d} ${h}`).join(" · ") || "—"}</dd></div>
                  <div><dt className="inline font-semibold">Services: </dt><dd className="inline">{((facts["services"] as string[]) ?? []).join(", ") || "—"}</dd></div>
                  <div><dt className="inline font-semibold">Service area: </dt><dd className="inline">{(facts["service_area"] as string) ?? "—"}</dd></div>
                  <div><dt className="inline font-semibold">Pricing signals: </dt><dd className="inline">{(facts["pricing_signals"] as string) ?? "—"}</dd></div>
                  <div><dt className="inline font-semibold">Review sentiment: </dt><dd className="inline">{(facts["review_sentiment"] as string) ?? "—"}</dd></div>
                  <div><dt className="inline font-semibold">Differentiators: </dt><dd className="inline">{((facts["differentiators"] as string[]) ?? []).join("; ") || "—"}</dd></div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide">Generated JSON-LD</h4>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
{JSON.stringify(business["localbusiness_jsonld"], null, 2)}
                </pre>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
{JSON.stringify(business["faq_jsonld"], null, 2)}
                </pre>
              </div>
            </div>
          )}

          <h4 className="mt-6 text-sm font-bold uppercase tracking-wide">Buyer questions ({qa.filter((q) => q["answered"]).length}/10 answered)</h4>
          <ul className="mt-2 space-y-3">
            {qa.map((q) => (
              <li key={q["id"] as string} className="rounded-lg border border-border p-3">
                <input
                  defaultValue={q["question"] as string}
                  onBlur={(e) =>
                    qaFn({ data: { id: q["id"] as string, question: e.target.value, answer: (q["answer"] as string) ?? null } })
                  }
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
                <textarea
                  defaultValue={(q["answer"] as string) ?? ""}
                  placeholder="No answer — insufficient scanned data"
                  rows={2}
                  onBlur={async (e) => {
                    await qaFn({
                      data: { id: q["id"] as string, question: q["question"] as string, answer: e.target.value },
                    });
                    qc.invalidateQueries({ queryKey: ["kg-business", openId] });
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                {!q["answered"] && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Flagged insufficient data{q["missing_data"] ? `: ${q["missing_data"] as string}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
