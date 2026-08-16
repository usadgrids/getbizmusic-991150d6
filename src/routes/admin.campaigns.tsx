import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Download, Users, Send, Filter, Eye, MailCheck, Save, RotateCcw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  importApolloLeads,
  sendResendCampaign,
  sendTestCampaign,
  getCampaignDashboard,
} from "@/lib/campaigns.functions";

const TEMPLATE_KEY = "gbm-campaign-template-v1";
const DEFAULT_SUBJECT = "Welcome to National City — GetBizMusic wants to feature your new business";
const DEFAULT_HTML = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;">
  <h1 style="font-size:22px;margin:0 0 12px;">Congrats on launching in ${new Date().getFullYear()}!</h1>
  <p>Hi there,</p>
  <p>We're <strong>GetBizMusic</strong>, National City's free-to-play music streaming site with a rotating business ad slider. Local shoppers listen in for hours — and see local businesses like yours the whole time.</p>
  <p>As a newly founded 2026 business, you're invited to run a rotating spotlight ad starting at <strong>$24</strong>.</p>
  <p><a href="https://getbizmusic.com/pricing" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block;">See pricing</a></p>
  <p>Talk soon,<br/>The GetBizMusic team</p>
</div>`;

export const Route = createFileRoute("/admin/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — Admin — GetBizMusic" },
      { name: "description", content: "B2B lead generation and email campaigns." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (ready === null) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</div>;
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Admin sign-in required</h1>
          <Link to="/admin" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">Go to Admin sign-in</Link>
        </div>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const qc = useQueryClient();
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [year, setYear] = useState<string>("");

  const load = useServerFn(getCampaignDashboard);
  const imp = useServerFn(importApolloLeads);
  const send = useServerFn(sendResendCampaign);
  const sendTest = useServerFn(sendTestCampaign);

  const filters = useMemo(
    () => ({
      city: city || undefined,
      industryCategory: category || undefined,
      foundedYear: year ? Number(year) : undefined,
    }),
    [city, category, year],
  );

  const q = useQuery({
    queryKey: ["campaigns-dashboard", filters],
    queryFn: () => load({ data: filters }),
  });

  const importMut = useMutation({
    mutationFn: () => imp({ data: { target: 500 } }),
    onSuccess: (r) => {
      toast.success(
        `Imported ${r.inserted_total} leads (NC: ${r.inserted_national_city}, South Bay fallback: ${r.inserted_south_bay_fallback})`,
      );
      qc.invalidateQueries({ queryKey: ["campaigns-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  const [showSend, setShowSend] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Load saved template (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATE_KEY);
      if (!raw) return;
      const t = JSON.parse(raw) as { subject?: string; html?: string; savedAt?: string };
      if (typeof t.subject === "string") setSubject(t.subject);
      if (typeof t.html === "string") setHtml(t.html);
      if (t.savedAt) setSavedAt(t.savedAt);
    } catch {
      /* ignore */
    }
  }, []);

  const saveTemplate = () => {
    const stamp = new Date().toISOString();
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ subject, html, savedAt: stamp }));
      setSavedAt(stamp);
      toast.success("Template saved — it will load automatically next time");
    } catch {
      toast.error("Could not save template in this browser");
    }
  };

  const resetTemplate = () => {
    try {
      localStorage.removeItem(TEMPLATE_KEY);
    } catch {
      /* ignore */
    }
    setSubject(DEFAULT_SUBJECT);
    setHtml(DEFAULT_HTML);
    setSavedAt(null);
    toast.success("Reverted to the default template");
  };


  const sendMut = useMutation({
    mutationFn: () => send({ data: { subject, htmlContent: html } }),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.reason ?? "Send failed");
        return;
      }
      toast.success(
        `Campaign sent — ${r.sent} delivered to Resend, ${r.failed} failed, ${r.skipped_suppressed} skipped (unsubscribed).`,
      );
      setShowSend(false);
      setConfirmed(false);
      qc.invalidateQueries({ queryKey: ["campaigns-dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });


  const testMut = useMutation({
    mutationFn: () => sendTest({ data: { toEmail: testEmail, subject, htmlContent: html } }),
    onSuccess: (r) => {
      toast.success(`Test email sent to ${r.to}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Test send failed"),
  });

  const s = q.data?.stats;
  const m = q.data?.monitoring;
  const leads = q.data?.leads ?? [];
  const fOpts = q.data?.filters;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> Admin</Link>
            <h1 className="text-lg font-semibold">B2B Campaigns</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => importMut.mutate()} disabled={importMut.isPending} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-50">
              <Download className="w-4 h-4" /> {importMut.isPending ? "Importing…" : "Import from Apollo"}
            </button>
            <button onClick={() => setShowSend((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded">
              <Send className="w-4 h-4" /> Send campaign
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Stat label="Total leads" value={s?.total ?? 0} />
          <Stat label="National City" value={s?.national_city ?? 0} tone="blue" />
          <Stat label="South Bay fallback" value={s?.south_bay_fallback ?? 0} tone="amber" />
          <Stat label="Not sent" value={s?.not_sent ?? 0} />
          <Stat label="Sent" value={s?.sent ?? 0} tone="green" />
          <Stat label="Opened" value={s?.opened ?? 0} tone="green" />
          <Stat label="Clicked" value={s?.clicked ?? 0} tone="green" />
          <Stat label="Bounced" value={s?.bounced ?? 0} tone="red" />
        </section>

        {/* Email monitoring */}
        <section className="bg-white p-4 rounded shadow-sm border space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Email monitoring
            </h2>
            <p className="text-xs text-gray-500">
              {m?.last_event_at ? `Last event ${new Date(m.last_event_at).toLocaleString()}` : "No events yet"}
              {" · live from Resend webhooks"}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Sent successfully" value={m?.sent_ok ?? 0} sub={`${m?.attempted ?? 0} attempted`} tone="green" />
            <Stat label="Received (delivered)" value={m?.delivered ?? 0} sub={`${m?.delivery_rate ?? 0}% delivery rate`} tone="green" />
            <Stat label="Opened (unique)" value={m?.opened_unique ?? 0} sub={`${m?.open_rate ?? 0}% open rate`} tone="blue" />
            <Stat label="Reopened" value={m?.reopened ?? 0} sub={`${m?.reopen_rate ?? 0}% of openers`} tone="blue" />
            <Stat label="Total opens" value={m?.total_opens ?? 0} sub="incl. repeat opens" />
            <Stat label="Bounced / failed" value={m?.bounced ?? 0} tone="red" />
          </div>
          <p className="text-xs text-gray-500">
            "Received" counts Resend <code>email.delivered</code> events (an open also implies delivery). "Reopened" counts
            recipients who opened more than once.
          </p>
        </section>


        {/* Send composer */}
        {showSend && (
          <section className="bg-white p-4 rounded shadow-sm border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-sm text-gray-700">Compose campaign</h2>
                {savedAt && (
                  <p className="text-[11px] text-gray-500">Saved template loaded · {new Date(savedAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  <Save className="w-3.5 h-3.5" /> Save template
                </button>
                <button
                  onClick={resetTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border bg-white hover:bg-gray-50 text-gray-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to default
                </button>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border ${showPreview ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white hover:bg-gray-50"}`}
                >
                  <Eye className="w-3.5 h-3.5" /> {showPreview ? "Hide preview" : "Preview"}
                </button>
              </div>
            </div>

            <input
              className="w-full border px-3 py-2 rounded text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <textarea
              className="w-full border px-3 py-2 rounded text-sm font-mono min-h-[240px]"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="HTML content — CAN-SPAM footer + unsubscribe are appended automatically"
            />
            {showPreview && (
              <div className="border rounded overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 border-b">Preview with footer</div>
                <iframe
                  title="Email preview"
                  srcDoc={html}
                  className="w-full h-80 bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              The system automatically appends the mailing address footer and a working unsubscribe link.
              Sends only to leads with status = <code>not_sent</code>.
            </p>

            {/* Test send */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-indigo-50 p-3 rounded border border-indigo-100">
              <MailCheck className="w-4 h-4 text-indigo-600 mt-0.5 sm:mt-0" />
              <div className="flex-1 text-sm text-indigo-900">
                <span className="font-medium">Test first:</span> send a preview to yourself before launching.
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 sm:w-56 border px-3 py-2 rounded text-sm"
                />
                <button
                  onClick={() => testMut.mutate()}
                  disabled={testMut.isPending || !testEmail}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-50 whitespace-nowrap"
                >
                  {testMut.isPending ? "Sending…" : "Send test"}
                </button>
              </div>
            </div>

            {/* Launch controls */}
            <div className="flex flex-col gap-3 pt-2 border-t">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-gray-300"
                />
                I have previewed the email and sent a test. I'm ready to launch to all unsent leads.
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => sendMut.mutate()}
                  disabled={sendMut.isPending || !confirmed}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded disabled:opacity-50"
                >
                  {sendMut.isPending ? "Launching…" : "Launch campaign"}
                </button>
                <button onClick={() => { setShowSend(false); setShowPreview(false); setConfirmed(false); }} className="px-4 py-2 bg-gray-100 text-sm rounded">Cancel</button>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="bg-white p-3 rounded shadow-sm border flex flex-wrap items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-gray-500" />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All cities</option>
            {fOpts?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All categories</option>
            {fOpts?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All years</option>
            {fOpts?.years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          {(city || category || year) && (
            <button onClick={() => { setCity(""); setCategory(""); setYear(""); }} className="text-xs text-blue-600 underline">Clear</button>
          )}
        </section>

        {/* Leads table */}
        <section className="bg-white rounded shadow-sm border overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2 text-sm font-medium text-gray-700">
            <Users className="w-4 h-4" /> Leads ({leads.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Business</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Founded</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.business_name ?? "—"}</td>
                    <td className="px-3 py-2">{l.owner_name ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{l.email}</td>
                    <td className="px-3 py-2">{l.city ?? "—"}</td>
                    <td className="px-3 py-2">{l.industry_category ?? "—"}</td>
                    <td className="px-3 py-2">{l.founded_year ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {l.source_detail === "south_bay_fallback"
                        ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">South Bay</span>
                        : <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">National City</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <StatusPill status={l.campaign_status} />
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">No leads yet. Click "Import from Apollo" to fetch your first batch.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone, sub }: { label: string; value: number; tone?: "green" | "red" | "amber" | "blue"; sub?: string }) {
  const toneClass =
    tone === "green" ? "text-emerald-700 bg-emerald-50"
    : tone === "red" ? "text-red-700 bg-red-50"
    : tone === "amber" ? "text-amber-800 bg-amber-50"
    : tone === "blue" ? "text-blue-700 bg-blue-50"
    : "text-gray-800 bg-gray-50";
  return (
    <div className={`rounded border p-3 ${toneClass}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    not_sent: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    opened: "bg-emerald-100 text-emerald-700",
    clicked: "bg-emerald-200 text-emerald-900",
    bounced: "bg-red-100 text-red-700",
    unsubscribed: "bg-orange-100 text-orange-800",
  };
  return <span className={`px-2 py-0.5 rounded ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}
