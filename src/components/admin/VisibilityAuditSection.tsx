import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gauge, Download, Sparkles, FileText, Printer } from "lucide-react";
import { buildAuditReportHtml, slugify } from "@/lib/audit-report";
import { adminListAuditTargets, adminRunVisibilityAudit } from "@/lib/ai-audit.functions";
import { buildScoreBadgeSvg, svgDataUrl, scoreBadgePng, downloadBlob } from "@/lib/score-badge";

const DEFAULT_PROMPT =
  "Research everything you can on the internet about this business and give it an AI Optimization score audit. " +
  "Judge how likely AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini) are to find, trust and cite this business " +
  "when someone asks an unbranded question about their product or service in their city. " +
  "Score web presence, reviews and reputation, structured data / schema markup, content and Q&A answerability, " +
  "local NAP consistency, and overall AI citability. Be strict and realistic — most small local businesses score between 25 and 65.";

type Audit = {
  business: string;
  overall: number;
  subscores: Array<{ label: string; score: number; note: string }>;
  strengths: string[];
  recommendations: string[];
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
                  Strengths
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
                  Recommendations
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {audit.recommendations.map((s, i) => (
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
