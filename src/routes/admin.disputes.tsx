import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Shield, AlertTriangle, Send, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/ads.functions";
import {
  listDisputes,
  submitDisputeEvidence,
  updateDisputeEvidence,
} from "@/lib/disputes.functions";

export const Route = createFileRoute("/admin/disputes")({
  head: () => ({
    meta: [
      { title: "Disputes — Admin — BizSpot" },
      { name: "description", content: "Review and submit Stripe dispute evidence." },
    ],
  }),
  component: DisputesPage,
});

function DisputesPage() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === null) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading…</div>;
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">Please sign in on the admin console first.</p>
          <Link to="/admin" className="text-[#0F2A4A] underline">Go to /admin</Link>
        </div>
      </div>
    );
  }
  return <DisputesConsole />;
}

function DisputesConsole() {
  const amIAdminFn = useServerFn(amIAdmin);
  const listFn = useServerFn(listDisputes);
  const qc = useQueryClient();

  const adminQ = useQuery({ queryKey: ["disputes-admin"], queryFn: () => amIAdminFn() });
  const listQ = useQuery({
    queryKey: ["disputes"],
    queryFn: () => listFn(),
    enabled: !!adminQ.data?.admin,
  });

  if (adminQ.isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Checking access…</div>;
  if (!adminQ.data?.admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="mx-auto text-[#D4A24C]" />
          <p className="text-sm text-gray-600 mt-2">Admin role required.</p>
          <Link to="/admin" className="text-[#0F2A4A] underline text-sm">Back to admin</Link>
        </div>
      </div>
    );
  }

  const rows = listQ.data ?? [];
  const refetch = () => qc.invalidateQueries({ queryKey: ["disputes"] });

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#0F2A4A] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-[#D4A24C]" size={20} />
            <h1 className="font-serif text-lg">Chargeback Disputes</h1>
          </div>
          <Link to="/admin" className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to admin
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Evidence is drafted automatically when a dispute is filed, but nothing is sent to Stripe until you
          click <strong>Submit to Stripe</strong> below. You can edit the draft first.
        </div>

        {listQ.isLoading && <p className="text-sm text-gray-500">Loading disputes…</p>}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500 text-center">
            No disputes on file. When a customer files a chargeback, it will appear here for review.
          </div>
        )}

        {rows.map((d: any) => (
          <DisputeCard key={d.id} d={d} onChanged={refetch} />
        ))}
      </main>
    </div>
  );
}

function DisputeCard({ d, onChanged }: { d: any; onChanged: () => void }) {
  const [text, setText] = useState<string>(d.evidence_text ?? "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveFn = useServerFn(updateDisputeEvidence);
  const submitFn = useServerFn(submitDisputeEvidence);
  const isSubmitted = d.status === "submitted";

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { id: d.id, evidenceText: text } });
      toast.success("Draft saved");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!confirm("Send this evidence to Stripe? This action is final and cannot be edited afterward.")) return;
    setSubmitting(true);
    try {
      // Save latest text first
      await saveFn({ data: { id: d.id, evidenceText: text } });
      await submitFn({ data: { id: d.id } });
      toast.success("Evidence submitted to Stripe");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="font-semibold text-[#0F2A4A]">Dispute {d.dispute_id}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Reason: <span className="font-medium">{d.reason ?? "—"}</span> · Amount:{" "}
            ${((d.amount_cents ?? 0) / 100).toFixed(2)} {String(d.currency ?? "usd").toUpperCase()} ·{" "}
            Env: {d.environment}
          </div>
          {d.stripe_session_id && (
            <div className="text-xs text-gray-500 mt-0.5">Session: {d.stripe_session_id}</div>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-semibold ${
            isSubmitted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {isSubmitted ? `Submitted ${new Date(d.submitted_at).toLocaleString()}` : "Pending review"}
        </span>
      </div>

      <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Evidence packet</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSubmitted}
        rows={16}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A24C] disabled:bg-gray-50 disabled:text-gray-500"
      />

      {!isSubmitted && (
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          <button
            onClick={save}
            disabled={saving || submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={submit}
            disabled={saving || submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-[#0F2A4A] text-white rounded-md hover:bg-[#1a3a60] disabled:opacity-60"
          >
            <Send size={14} /> {submitting ? "Submitting…" : "Submit to Stripe"}
          </button>
        </div>
      )}
    </div>
  );
}
