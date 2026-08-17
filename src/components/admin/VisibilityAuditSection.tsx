import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gauge, Download, Sparkles, FileText, Printer } from "lucide-react";
import { buildAuditReportHtml, slugify } from "@/lib/audit-report";
import { adminListAuditTargets, adminRunVisibilityAudit } from "@/lib/ai-audit.functions";
import { buildScoreBadgeSvg, svgDataUrl, scoreBadgePng, downloadBlob } from "@/lib/score-badge";

const DEFAULT_PROMPT = `Build an AI Visibility Score Audit feature. When a business is scanned, run this pipeline in a Supabase Edge Function (not client-side, so API keys stay secure):

Gather — Pull the business's info from Google Places Details API plus a scrape of their website and social profiles.

Clean up — Send that raw data to Claude to organize it into clear fields: hours, services, service area, pricing signals, review sentiment, and what makes them different from competitors.

Build schema — Auto-generate LocalBusiness + FAQPage JSON-LD from those fields and add it to the business's Knowledge Graph page (same pattern as the /sdcounty directory).

Generate Q&A — Send the cleaned-up profile to Claude again to write 10 realistic buyer questions ('who's the best emergency plumber in National City open weekends') with answers based only on the scanned facts, formatted as FAQPage schema so AI answer engines can pull them directly.

Score — Calculate an AI Visibility Score (0-100), broken into 4 components: Data Completeness (25 pts) — check 8 key fields (hours, services list, service area, pricing signals, photos, phone, address, website); score = (fields found / 8) × 25. Schema Coverage (25 pts) — LocalBusiness JSON-LD generated and passing validation (15 pts) plus FAQPage JSON-LD generated and passing validation (10 pts). Answer-ability (30 pts) — of the 10 generated buyer questions, how many were answered using real scanned facts (not skipped or marked 'insufficient data'); score = (answered / 10) × 30. Review Signal (20 pts) — based on Google review count and average rating: 20+ reviews and 4.5+ rating = full 20 pts, scaled down proportionally for fewer reviews or lower ratings, 0 reviews = 0 pts. Sum the 4 components for the final score and assign a letter grade for client-facing display: 90-100 = A ('AI-ready — answer engines can confidently recommend you'), 75-89 = B ('Strong, with a few gaps'), 60-74 = C ('Visible but incomplete — missing info is limiting your reach'), 40-59 = D ('Weak signal — most AI engines can't answer basic questions about you'), below 40 = F ('Not AI-visible — critical info is missing'). Store the numeric score, letter grade, and the 4 component sub-scores in the businesses table. On the admin dashboard, show the score, grade, and a plain-English breakdown of the weakest component (e.g. 'Your biggest gap: Answer-ability — 4 of 10 buyer questions couldn't be answered due to missing pricing and service area data'). Recalculate automatically any time the business is rescanned.

Publish — Save everything to Supabase and show it live on the business's Knowledge Graph page.

Create the database tables (businesses, business_facts, qa_pairs), the admin review dashboard so I can check/edit results before they go live, and the Edge Functions for steps 1-4. Flag if the JSON-LD schema needs manual validation before publishing.`;

type Audit = {
  business: string;
  overall: number;
  subscores: Array<{ label: string; score: number; note: string }>;
  strengths: string[];
  recommendations: string[];
  gbmStandalone?: string[];
  gbmKnowledgeGraph?: string[];
  summary: string;
  sources: string[];
};

export function VisibilityAuditSection() {
  const targetsFn = useServerFn(adminListAuditTargets);
  const runFn = useServerFn(adminRunVisibilityAudit);

  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [running, setRunning] = useState(false);
  const [audit, setAudit] = useState<Audit | null>(null);

  const targets = useQuery({
    queryKey: ["admin-audit-targets"],
    queryFn: () => targetsFn({}),
  });

  const options = targets.data?.targets ?? [];

  const pick = (id: string) => {
    setSelected(id);
    const t = options.find((o) => o.id === id);
    if (t) {
      setName(t.name);
      setCity(t.city ?? "");
      setState(t.state ?? "");
      setWebsite(t.website ?? "");
    }
  };

  const run = async () => {
    if (name.trim().length < 2) {
      toast.error("Enter a business name first.");
      return;
    }
    setRunning(true);
    setAudit(null);
    try {
      const res = await runFn({
        data: {
          businessName: name.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          website: website.trim() || null,
          prompt: prompt.trim() || null,
        },
      });
      if (res.ok) {
        setAudit(res.audit);
        toast.success(`Audit complete — ${res.audit.overall}/100.`);
      } else {
        toast.error(res.error ?? "Audit failed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setRunning(false);
    }
  };

  const badgeSvg = useMemo(
    () => (audit ? svgDataUrl(buildScoreBadgeSvg(audit.overall)) : null),
    [audit],
  );

  const downloadBadge = async () => {
    if (!audit) return;
    try {
      const blob = await scoreBadgePng(audit.overall, 1000);
      downloadBlob(blob, `${slugify(audit.business) || "business"}-ai-visibility-${audit.overall}.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const downloadReport = () => {
    if (!audit) return;
    try {
      const html = buildAuditReportHtml(audit);
      downloadBlob(
        new Blob([html], { type: "text/html;charset=utf-8" }),
        `${slugify(audit.business) || "business"}-ai-visibility-report-${audit.overall}.html`,
      );
      toast.success("Report downloaded — open it and print to PDF to share.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  };

  const printReport = () => {
    if (!audit) return;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to print the report.");
      return;
    }
    w.document.write(buildAuditReportHtml(audit));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-card-foreground">
          <Gauge className="h-5 w-5" aria-hidden /> AI Visibility Score Audit
        </h2>
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        Research any business on the web, score how visible it is to AI answer engines, and download a
        circular score badge you can send them.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Existing advertiser (optional)</span>
          <select
            value={selected}
            onChange={(e) => pick(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— New prospect (type below) —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.city ? ` — ${o.city}${o.state ? `, ${o.state}` : ""}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium">Business name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cut and Dye Salon"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Website (optional)</span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
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
            placeholder="CA"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block font-medium">Research command</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {running ? "Researching & scoring…" : "Run AI Visibility Audit"}
      </button>

      {audit && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center gap-3">
            {badgeSvg && (
              <img
                src={badgeSvg}
                alt={`${audit.business} AI Visibility Score ${audit.overall} out of 100`}
                className="w-64 max-w-full"
              />
            )}
            <button
              type="button"
              onClick={downloadBadge}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" aria-hidden /> Download badge PNG
            </button>
            <button
              type="button"
              onClick={downloadReport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <FileText className="h-4 w-4" aria-hidden /> Download full report
            </button>
            <button
              type="button"
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Printer className="h-4 w-4" aria-hidden /> Print / Save as PDF
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold">{audit.business}</h3>
              {audit.summary && <p className="mt-1 text-sm text-muted-foreground">{audit.summary}</p>}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {audit.subscores.map((s) => (
                <div key={s.label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{s.label}</span>
                    <span>{s.score}/100</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  {s.note && <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>}
                </div>
              ))}
            </div>

            {audit.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What&rsquo;s already working
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {audit.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {audit.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Growth opportunities for you & your web team
                </h4>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Simple steps you or your own web team can take to help more customers find you — think of them as a helpful checklist.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {audit.recommendations.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {(audit.gbmStandalone?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  How GetBizMusic.com can help you — no website access needed
                </h4>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  We handle these entirely on GetBizMusic.com — no login or changes to your own website or profiles needed.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {audit.gbmStandalone!.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {(audit.gbmKnowledgeGraph?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  What we&rsquo;ll build into your Knowledge Graph page
                </h4>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Woven into your unique GetBizMusic Knowledge Graph URL so AI answer engines can discover, trust, and recommend you.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {audit.gbmKnowledgeGraph!.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {audit.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Sources reviewed
                </h4>
                <ul className="mt-2 space-y-1 text-xs">
                  {audit.sources.map((u) => (
                    <li key={u}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:underline"
                      >
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
