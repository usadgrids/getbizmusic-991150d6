import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, ArrowLeft, Check, X, Clock, Shield, ExternalLink, Trash2, Plus, CreditCard, Upload, Pencil, Users, Percent, DollarSign, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  amIAdmin,
  approveSubmission,
  claimAdmin,
  createManualSubmission,
  listActiveAdsAdmin,
  listPendingSubmissions,
  rejectSubmission,
  removeAd,
  updateAd,
} from "@/lib/ads.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { getActiveCities } from "@/lib/cities.functions";
import { INDUSTRIES, AD_PLANS, isReligiousIndustry } from "@/lib/biz-utils";
import { listReps, createRep, updateRep, deleteRep, listRepOrders, type RepRow } from "@/lib/reps.functions";
import { listDesignOrders, deleteDesignOrder, setDesignOrderCompleted, type DesignOrderRow } from "@/lib/design.functions";
import { listZelleOrders, markZelleOrderPaid, cancelZelleOrder, type ZelleOrderAdminRow } from "@/lib/payments.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Get Biz Music - National City, CA" },
      { name: "description", content: "Review and approve business ad submissions." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading…</div>;
  }
  if (!session) return <AuthForm />;
  return <AdminConsole />;
}

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created — sign in now.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F2A4A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-[#D4A24C] text-[#0F2A4A] rounded-lg p-2">
            <Lock size={18} />
          </div>
          <h2 className="font-bold text-lg text-[#0F2A4A]">Admin Access</h2>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-[#0F2A4A] text-white rounded-md py-2 font-semibold hover:bg-[#163864] disabled:opacity-60"
          >
            {loading ? "Working…" : mode === "signin" ? "Sign In" : "Create Admin"}
          </button>
          <button
            type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-gray-500 hover:text-[#0F2A4A]"
          >
            {mode === "signin" ? "First time? Create the admin account →" : "← Back to sign in"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={async () => {
                if (!email) return toast.error("Enter your email first.");
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + "/reset-password",
                  });
                  if (error) throw error;
                  toast.success("Password reset link sent — check your email.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to send reset email");
                }
              }}
              className="w-full text-xs text-[#0F2A4A] hover:underline"
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminConsole() {
  const qc = useQueryClient();
  const amIAdminFn = useServerFn(amIAdmin);
  const claimFn = useServerFn(claimAdmin);
  const pendingFn = useServerFn(listPendingSubmissions);
  const adsFn = useServerFn(listActiveAdsAdmin);
  const approveFn = useServerFn(approveSubmission);
  const rejectFn = useServerFn(rejectSubmission);
  const removeFn = useServerFn(removeAd);

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => amIAdminFn(),
  });
  const isAdmin = !!roleData?.admin;

  const { data: pending = [], refetch: refetchPending } = useQuery({
    queryKey: ["pending-subs"],
    queryFn: () => pendingFn(),
    enabled: isAdmin,
  });
  const { data: liveAds = [], refetch: refetchAds } = useQuery({
    queryKey: ["live-ads"],
    queryFn: () => adsFn(),
    enabled: isAdmin,
  });
  type LiveAd = (typeof liveAds)[number];
  const [editingAd, setEditingAd] = useState<LiveAd | null>(null);

  const [adsSearch, setAdsSearch] = useState("");
  type SortKey = "business" | "city" | "state" | "ad_number" | "type" | "status" | "expires";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "expires", dir: "desc" });
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const cityOf = (a: LiveAd) =>
    (a as unknown as { cities?: { name?: string; state?: string } | null }).cities ?? null;
  const filteredLiveAds = (() => {
    const raw = adsSearch.trim();
    const base = !raw
      ? [...liveAds]
      : (() => {
          const q = raw.toLowerCase();
          const numericQ = raw.replace(/^#/, "").trim();
          return liveAds.filter((a) => {
            const adNum = a.ad_number != null ? String(a.ad_number) : "";
            const c = cityOf(a);
            return (
              a.business_name.toLowerCase().includes(q) ||
              (a.industry ?? "").toLowerCase().includes(q) ||
              (c?.name ?? "").toLowerCase().includes(q) ||
              (c?.state ?? "").toLowerCase().includes(q) ||
              (numericQ.length > 0 && adNum.includes(numericQ))
            );
          });
        })();
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (a: LiveAd): string | number => {
      const c = cityOf(a);
      switch (sort.key) {
        case "business": return a.business_name.toLowerCase();
        case "city": return (c?.name ?? "").toLowerCase();
        case "state": return (c?.state ?? "").toLowerCase();
        case "ad_number": return a.ad_number ?? -1;
        case "type": return a.ad_type;
        case "status": return a.status;
        case "expires": return new Date(a.expires_at).getTime();
      }
    };
    base.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return base;
  })();

  const refreshAll = () => {
    refetchPending();
    refetchAds();
  };

  const handleClaim = async () => {
    try {
      await claimFn();
      toast.success("You are now an admin.");
      qc.invalidateQueries({ queryKey: ["am-i-admin"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md p-6 text-center">
          <Shield className="mx-auto text-[#D4A24C] mb-3" size={36} />
          <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">Become the first admin</h2>
          <p className="text-sm text-gray-600 mt-2">
            No admin exists for this site yet. Claim the role to manage ad approvals.
            Once claimed, only you can grant admin to other users.
          </p>
          <button
            onClick={handleClaim}
            className="mt-5 bg-[#D4A24C] text-[#0F2A4A] font-semibold px-5 py-2 rounded-md hover:bg-[#e0b266]"
          >
            Claim admin role
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="block mx-auto mt-3 text-xs text-gray-500 hover:text-[#0F2A4A]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <header className="bg-[#0F2A4A] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-[#D4A24C]" size={20} />
            <h1 className="font-serif text-lg">Admin Console</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/admin/disputes" className="hover:text-[#D4A24C]">Disputes</Link>
            <Link to="/" className="hover:text-[#D4A24C]">View site →</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-white/80 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        {/* Pending */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-[#D4A24C]" />
            <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">
              Pending Review ({pending.length})
            </h2>
          </div>
          {pending.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500 text-center">
              No submissions waiting. New submissions show up here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map((s) => (
                <PendingCard
                  key={s.id}
                  s={s as unknown as PendingRow}
                  onApprove={async () => {
                    try {
                      await approveFn({ data: { id: s.id } });
                      toast.success("Approved — ad is now live for 1 year");
                      refreshAll();
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                  }}
                  onReject={async (reason) => {
                    try {
                      const res = await rejectFn({ data: { id: s.id, reason } });
                      // Fire-and-forget rejection email so the admin isn't blocked
                      const info = res?.submission;
                      if (info?.email) {
                        try {
                          await sendTransactionalEmail({
                            templateName: "ad-rejection",
                            recipientEmail: info.email,
                            idempotencyKey: `ad-rejection-${s.id}`,
                            templateData: {
                              businessName: info.business_name,
                              contactName: info.contact_name,
                              reason,
                              plan: info.ad_type === "slider_10" ? "Featured Slider Ad ($24)" : "Standard Image Ad ($12)",
                            },
                          });
                          toast.success("Rejected — notice emailed to submitter");
                        } catch (mailErr) {
                          console.error(mailErr);
                          toast.warning("Rejected, but rejection email failed to queue");
                        }
                      } else {
                        toast.success("Rejected");
                      }
                      refreshAll();
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <ManualSubmitSection onCreated={refreshAll} />

        <AdRepsSection />

        <DesignOrdersSection />




        {/* Live ads */}
        <section>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">
                Currently Running ({liveAds.filter((a) => a.status === "active").length})
              </h2>
            </div>
            <input
              type="text"
              value={adsSearch}
              onChange={(e) => setAdsSearch(e.target.value)}
              placeholder="Search by Business, City, State, Industry, or Ad #"
              className="ml-auto w-full sm:w-96 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2A4A]/30"
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  {([
                    ["business", "Business"],
                    ["city", "City"],
                    ["state", "State"],
                    ["ad_number", "Ad #"],
                    ["type", "Type"],
                    ["status", "Status"],
                    ["expires", "Expires"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th key={key} className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 hover:text-[#0F2A4A]"
                      >
                        {label}
                        {sort.key === key && <span aria-hidden>{sort.dir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLiveAds.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    {liveAds.length === 0 ? "No ads yet." : "No ads match your search."}
                  </td></tr>
                )}
                {filteredLiveAds.map((a) => {
                  const city = (a as unknown as { cities?: { name?: string; state?: string } | null }).cities;
                  return (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-[#0F2A4A]">{a.business_name}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{city?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{city?.state ?? "—"}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700">#{a.ad_number ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {isReligiousIndustry(a.industry)
                        ? "FREE · $0"
                        : a.ad_type === "slider_10"
                        ? "Featured · $24"
                        : "Standard · $12"}
                    </td>
                    <td className="px-4 py-2">
                      {a.status === "active" ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Removed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {new Date(a.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-3 justify-end">
                        <button
                          onClick={() => setEditingAd(a)}
                          className="text-[#0F2A4A] hover:text-[#163864] inline-flex items-center gap-1 text-xs"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        {a.status === "active" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete "${a.business_name}"? This will permanently remove the ad and cannot be undone.`)) return;
                              try {
                                await removeFn({ data: { id: a.id } });
                                toast.success("Deleted");
                                refreshAll();
                              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                            }}
                            className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {editingAd && (
        <EditAdModal
          ad={editingAd as unknown as React.ComponentProps<typeof EditAdModal>["ad"]}
          onClose={() => setEditingAd(null)}
          onSaved={() => { setEditingAd(null); refreshAll(); }}
        />
      )}
    </div>
  );
}

type PendingRow = {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website_url: string | null;
  industry: string;
  tagline: string | null;
  ad_type: "image_5" | "slider_10";
  preview_url: string;
  created_at: string;
  ad_id?: string | null;
  city_id?: string | null;
  requested_city_name?: string | null;
  requested_state_code?: string | null;
  ad?: { ad_number: number } | { ad_number: number }[] | null;
  payment?: {
    id: string;
    stripe_session_id: string;
    customer_email: string;
    plan: string;
    amount_cents: number;
    status: string;
    environment: string;
    paid_at: string | null;
    created_at: string;
  } | null;
};

function PendingCard({
  s,
  onApprove,
  onReject,
}: {
  s: PendingRow;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const doReject = async () => {
    if (reason.trim().length < 5) {
      toast.error("Please provide a rejection reason (at least 5 characters).");
      return;
    }
    setBusy(true);
    try {
      await onReject(reason.trim());
      setShowReject(false);
      setReason("");
    } finally {
      setBusy(false);
    }
  };

  const pay = s.payment;
  const amount = pay ? (pay.amount_cents / 100).toFixed(2) : null;
  const orderNo = pay ? `#${pay.id.slice(0, 8).toUpperCase()}` : null;

  const isEdit = !!s.ad_id;
  const linkedAd = Array.isArray(s.ad) ? s.ad[0] : s.ad;
  const editingAdNumber = linkedAd?.ad_number ?? null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col ${isEdit ? "border-[#D4A24C]" : "border-gray-200"}`}>
      {isEdit && (
        <div className="bg-[#D4A24C] text-[#0F2A4A] text-xs font-bold px-3 py-1.5 text-center uppercase tracking-wide">
          Edit request — updating live ad {editingAdNumber ? `#${editingAdNumber}` : ""}
        </div>
      )}
      <div className="aspect-[1200/628] bg-gray-100">
        {s.preview_url && (
          <img src={s.preview_url} alt={s.business_name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-4 space-y-2 text-sm flex-1 flex flex-col">
        <div className="font-serif text-lg font-bold text-[#0F2A4A]">{s.business_name}</div>
        <div className="text-xs text-gray-500">
          {s.industry} · {s.ad_type === "slider_10" ? "Featured Slider ($24)" : "Standard ($12)"}
        </div>
        {!isEdit && s.requested_city_name && s.requested_state_code && (
          <div className="text-xs inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-md px-2 py-1 w-fit">
            📍 <span className="font-semibold">{s.requested_city_name}, {s.requested_state_code}</span>
            {!s.city_id && <span className="ml-1 text-[10px] uppercase tracking-wide bg-blue-600 text-white rounded px-1.5 py-0.5">will create page</span>}
          </div>
        )}
        {s.tagline && <div className="italic text-gray-700">"{s.tagline}"</div>}
        <div className="text-xs text-gray-600 space-y-0.5 pt-2 border-t border-gray-100">
          <div>👤 {s.contact_name}</div>
          <div>✉️ <a href={`mailto:${s.email}`} className="text-[#0F2A4A] hover:underline">{s.email}</a></div>
          <div>📞 {s.phone}</div>
          {s.website_url && (
            <div>
              🌐 <a href={s.website_url} target="_blank" rel="noreferrer" className="text-[#0F2A4A] hover:underline inline-flex items-center gap-1">
                {s.website_url} <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>

        {/* Payment / order info */}
        <div className="text-xs bg-slate-50 border border-slate-200 rounded-md p-2 mt-2 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#0F2A4A]">
            <CreditCard size={12} /> Payment
          </div>
          {pay ? (
            <>
              <div><span className="text-gray-500">Order:</span> <span className="font-mono">{orderNo}</span></div>
              <div><span className="text-gray-500">Amount:</span> ${amount} USD ({pay.environment})</div>
              <div><span className="text-gray-500">Status:</span> <span className="uppercase font-medium">{pay.status}</span></div>
              <div><span className="text-gray-500">Paid at:</span> {pay.paid_at ? new Date(pay.paid_at).toLocaleString() : "—"}</div>
              <div><span className="text-gray-500">Billed email:</span> {pay.customer_email}</div>
              <div className="truncate"><span className="text-gray-500">Stripe session:</span> <span className="font-mono text-[10px]">{pay.stripe_session_id}</span></div>
            </>
          ) : (
            <div className="italic text-amber-700">Manual submission — no payment on file (admin override)</div>
          )}
        </div>

        {!showReject ? (
          <div className="flex gap-2 pt-3 mt-auto">
            <button
              onClick={onApprove}
              className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-md hover:bg-emerald-700 inline-flex items-center justify-center gap-1"
            >
              <Check size={16} /> Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-700 inline-flex items-center justify-center gap-1"
            >
              <X size={16} /> Reject
            </button>
          </div>
        ) : (
          <div className="pt-3 mt-auto space-y-2">
            <label className="text-xs font-semibold text-red-700">
              Rejection reason (emailed to submitter)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="e.g. Image contains prohibited content. Per your agreement, non-approved ads are non-refundable."
              className="w-full border border-red-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="text-[11px] text-gray-500">
              The submitter will be emailed this reason plus a reminder that non-approved ads are non-refundable per the content agreement.
            </div>
            <div className="flex gap-2">
              <button
                onClick={doReject}
                disabled={busy}
                className="flex-1 bg-red-600 text-white font-semibold py-1.5 rounded-md hover:bg-red-700 disabled:opacity-60 text-sm"
              >
                {busy ? "Sending…" : "Confirm reject & email submitter"}
              </button>
              <button
                onClick={() => { setShowReject(false); setReason(""); }}
                disabled={busy}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualSubmitSection({ onCreated }: { onCreated: () => void }) {
  const createFn = useServerFn(createManualSubmission);
  const citiesFn = useServerFn(getActiveCities);
  const { data: cities = [] } = useQuery({
    queryKey: ["active-cities-admin"],
    queryFn: () => citiesFn(),
  });
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [adType, setAdType] = useState<"image_5" | "slider_10">("image_5");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);

  const toggleCity = (id: string) =>
    setSelectedCityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAllCities = () => setSelectedCityIds(cities.map((c) => c.id));
  const clearCities = () => setSelectedCityIds([]);

  const onFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) { toast.error("JPG, PNG, or WebP only"); return; }
    setFile(f);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) { toast.error("Please choose an image"); return; }
    if (selectedCityIds.length === 0) { toast.error("Select at least one city"); return; }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `admin/${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("ad-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const res = await createFn({
        data: {
          business_name: String(fd.get("business_name") ?? ""),
          contact_name: String(fd.get("contact_name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          website_url: String(fd.get("website_url") ?? ""),
          youtube_url: String(fd.get("youtube_url") ?? ""),
          industry: String(fd.get("industry") ?? ""),
          tagline: String(fd.get("tagline") ?? ""),
          ad_type: adType,
          image_path: path,
          auto_approve: autoApprove,
          city_ids: selectedCityIds,
        },
      });
      const n = res?.count ?? selectedCityIds.length;
      toast.success(
        autoApprove
          ? `Ad published live in ${n} ${n === 1 ? "city" : "cities"}`
          : `Ad added to pending queue for ${n} ${n === 1 ? "city" : "cities"}`,
      );
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setSelectedCityIds([]);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ad");
    } finally {
      setBusy(false);
    }
  };


  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-[#D4A24C]" />
          <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">Manual Ad Submission</h2>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Admin override — no payment</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm bg-[#0F2A4A] text-white px-3 py-1.5 rounded-md hover:bg-[#163864] inline-flex items-center gap-1"
        >
          <Plus size={14} /> {open ? "Close" : "New manual ad"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-[#0F2A4A] mb-2">Ad image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#D4A24C]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#0F2A4A] file:text-white hover:file:bg-[#163864] cursor-pointer"
                required
              />
              {file && (
                <div className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1">
                  <Check size={12} /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500 inline-flex items-start gap-1">
                <Upload size={12} className="mt-0.5" />
                Recommended: 1216×896 (4:3), under 2 MB.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminField name="business_name" label="Business name" required />
            <AdminField name="contact_name" label="Contact name" required />
            <AdminField name="email" type="email" label="Email" required />
            <AdminField name="phone" label="Phone" required />
            <AdminField name="website_url" label="Website (optional)" placeholder="https://..." />
            <div>
              <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Industry *</label>
              <select
                name="industry" required defaultValue=""
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
              >
                <option value="" disabled>Pick one…</option>
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>

          <AdminField name="tagline" label="Tagline (optional, max 120 chars)" maxLength={120} />
          <AdminField name="youtube_url" label="YouTube video URL (optional)" placeholder="https://www.youtube.com/watch?v=..." maxLength={500} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Ad plan / rotation</label>
              <select
                value={adType}
                onChange={(e) => setAdType(e.target.value as "image_5" | "slider_10")}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
              >
                <option value="image_5">{AD_PLANS.image_5.label} — {AD_PLANS.image_5.seconds}s rotation</option>
                <option value="slider_10">{AD_PLANS.slider_10.label} — {AD_PLANS.slider_10.seconds}s rotation</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-5">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
              />
              Auto-approve and publish immediately (1-year run)
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[#0F2A4A]">
                Display in cities * ({selectedCityIds.length} selected)
              </label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAllCities} className="text-[#0F2A4A] underline hover:text-[#163864]">
                  Select all
                </button>
                <button type="button" onClick={clearCities} className="text-gray-500 underline hover:text-gray-700">
                  Clear
                </button>
              </div>
            </div>
            <div className="border border-gray-300 rounded-md p-2 max-h-56 overflow-y-auto bg-white space-y-2">
              {cities.length === 0 && (
                <div className="text-xs text-gray-500 px-1 py-2">No active cities.</div>
              )}
              {Object.entries(
                cities.reduce<Record<string, typeof cities>>((acc, c) => {
                  const key = c.state || "—";
                  (acc[key] ||= []).push(c);
                  return acc;
                }, {}),
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([state, group]) => (
                  <div key={state}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-1 pb-0.5 border-b border-gray-100 mb-1">
                      {state}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCityIds.includes(c.id)}
                              onChange={() => toggleCity(c.id)}
                            />
                            <span>{c.name}</span>
                            <span className="ml-auto text-[10px] font-mono text-gray-400">{c.state}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">The same ad will be published to every selected city in one entry.</p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#D4A24C] text-[#0F2A4A] font-bold py-2.5 rounded-md hover:bg-[#e0b266] disabled:opacity-60"
          >
            {busy ? "Creating…" : autoApprove ? "Create & Publish Ad" : "Add to Pending Queue"}
          </button>
        </form>
      )}
    </section>
  );
}

function AdminField({
  name, label, required, type = "text", placeholder, maxLength,
}: {
  name: string; label: string; required?: boolean; type?: string;
  placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0F2A4A] mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input
        name={name} type={type} required={required} placeholder={placeholder} maxLength={maxLength}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
      />
    </div>
  );
}

function buildMinistryInfo(v: {
  churchName: string; churchAddress: string; pastorName: string; ministryPhone: string;
  is501c3: boolean; hasIrs: boolean; irsNumber: string;
}) {
  return {
    church_name: v.churchName.trim(),
    church_address: v.churchAddress.trim(),
    pastor_name: v.pastorName.trim(),
    phone: v.ministryPhone.trim(),
    is_501c3: v.is501c3,
    has_irs_number: v.hasIrs,
    irs_number: v.hasIrs ? v.irsNumber.trim() : "",
    attest_independent_ministry: true as const,
    attest_novelty: true as const,
  };
}

function EditAdModal({
  ad,
  onClose,
  onSaved,
}: {
  ad: {
    id: string;
    business_name: string;
    website_url: string | null;
    youtube_url: string | null;
    tagline: string | null;
    industry: string;
    ad_type: "image_5" | "slider_10";
    image_url: string;
    ad_number: number | null;
    ministry_info?: {
      church_name?: string;
      church_address?: string;
      pastor_name?: string;
      phone?: string;
      is_501c3?: boolean;
      has_irs_number?: boolean;
      irs_number?: string;
      attest_independent_ministry?: boolean;
      attest_novelty?: boolean;
    } | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateAd);
  const [businessName, setBusinessName] = useState(ad.business_name);
  const [websiteUrl, setWebsiteUrl] = useState(ad.website_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(ad.youtube_url ?? "");
  const [tagline, setTagline] = useState(ad.tagline ?? "");
  const [industry, setIndustry] = useState(ad.industry);
  const [adType, setAdType] = useState<"image_5" | "slider_10">(ad.ad_type);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Ministry / religious intake fields (only shown when industry is religious).
  const mi = ad.ministry_info ?? null;
  const [churchName, setChurchName] = useState(mi?.church_name ?? ad.business_name ?? "");
  const [churchAddress, setChurchAddress] = useState(mi?.church_address ?? "");
  const [pastorName, setPastorName] = useState(mi?.pastor_name ?? "");
  const [ministryPhone, setMinistryPhone] = useState(mi?.phone ?? "");
  const [is501c3, setIs501c3] = useState<boolean>(mi?.is_501c3 ?? false);
  const [hasIrs, setHasIrs] = useState<boolean>(mi?.has_irs_number ?? false);
  const [irsNumber, setIrsNumber] = useState(mi?.irs_number ?? "");

  const showMinistry = isReligiousIndustry(industry);

  const onFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) { toast.error("JPG, PNG, or WebP only"); return; }
    setFile(f);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let image_path: string | undefined;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        image_path = `admin/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("ad-uploads")
          .upload(image_path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
      }

      let ministry_info: ReturnType<typeof buildMinistryInfo> | null = null;
      if (showMinistry) {
        if (!churchName.trim() || !churchAddress.trim() || !pastorName.trim() || !ministryPhone.trim()) {
          toast.error("Please fill every Ministry Information field");
          setBusy(false);
          return;
        }
        if (hasIrs && !irsNumber.trim()) {
          toast.error("Enter the IRS non-profit number or uncheck 'Has IRS number'");
          setBusy(false);
          return;
        }
        ministry_info = buildMinistryInfo({
          churchName, churchAddress, pastorName, ministryPhone,
          is501c3, hasIrs, irsNumber,
        });
      }

      await updateFn({
        data: {
          id: ad.id,
          business_name: businessName,
          website_url: websiteUrl,
          youtube_url: youtubeUrl,
          tagline,
          industry,
          ad_type: adType,
          image_path,
          ministry_info: showMinistry ? ministry_info! : null,
        },
      });
      toast.success("Ad updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#0F2A4A]">Edit Ad</h3>
            <div className="text-xs text-gray-500">#{ad.ad_number ?? "—"} · {ad.business_name}</div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Current image</label>
          <div className="aspect-[1200/628] bg-gray-100 rounded-md overflow-hidden">
            {ad.image_url && <img src={ad.image_url} alt={ad.business_name} className="w-full h-full object-cover" />}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Replace image (optional)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#D4A24C]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#0F2A4A] file:text-white hover:file:bg-[#163864] cursor-pointer"
            />
            {file && (
              <div className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1">
                <Check size={12} /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500 inline-flex items-start gap-1">
              <Upload size={12} className="mt-0.5" /> Recommended: 1216×896 (4:3), under 2 MB.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Business name *</label>
            <input
              value={businessName} onChange={(e) => setBusinessName(e.target.value)} required maxLength={120}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Website</label>
            <input
              value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." maxLength={255}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Industry *</label>
            <select
              value={industry} onChange={(e) => setIndustry(e.target.value)} required
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            >
              {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              {!INDUSTRIES.some((i) => i.value === industry) && (
                <option value={industry}>{industry}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Ad plan / rotation</label>
            <select
              value={adType} onChange={(e) => setAdType(e.target.value as "image_5" | "slider_10")}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            >
              <option value="image_5">{AD_PLANS.image_5.label} — {AD_PLANS.image_5.seconds}s rotation</option>
              <option value="slider_10">{AD_PLANS.slider_10.label} — {AD_PLANS.slider_10.seconds}s rotation</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Tagline</label>
          <input
            value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0F2A4A] mb-1">YouTube video URL (optional)</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            maxLength={500}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
        </div>

        {showMinistry && (
          <div className="rounded-xl border-2 border-[#D4A24C] bg-[#FFF8E9] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[#0F2A4A] font-bold text-sm">Ministry Information (Free Religious Ad)</div>
              {mi ? null : <div className="text-[10px] text-amber-800">No ministry info on file — fill in below.</div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Church / Ministry name *</label>
                <input value={churchName} onChange={(e) => setChurchName(e.target.value)} maxLength={200}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Pastor / Leader name *</label>
                <input value={pastorName} onChange={(e) => setPastorName(e.target.value)} maxLength={200}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Address *</label>
                <input value={churchAddress} onChange={(e) => setChurchAddress(e.target.value)} maxLength={300}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A4A] mb-1">Phone *</label>
                <input value={ministryPhone} onChange={(e) => setMinistryPhone(e.target.value)} maxLength={40}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A4A] mb-1">IRS Non-Profit #</label>
                <input value={irsNumber} onChange={(e) => setIrsNumber(e.target.value)} maxLength={40} disabled={!hasIrs}
                  placeholder={hasIrs ? "e.g. 12-3456789" : "N/A"}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white disabled:bg-gray-100" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-[#0F2A4A]">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={is501c3} onChange={(e) => setIs501c3(e.target.checked)} />
                We are a non-profit 501(c)(3) organization
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hasIrs} onChange={(e) => setHasIrs(e.target.checked)} />
                We have an IRS non-profit number
              </label>
            </div>
          </div>
        )}




        <div className="flex gap-2 pt-2">
          <button
            type="submit" disabled={busy}
            className="flex-1 bg-[#D4A24C] text-[#0F2A4A] font-bold py-2.5 rounded-md hover:bg-[#e0b266] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button" onClick={onClose} disabled={busy}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= Ad Reps ================= */



function AdRepsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listReps);
  const createFn = useServerFn(createRep);
  const updateFn = useServerFn(updateRep);
  const deleteFn = useServerFn(deleteRep);
  const ordersFn = useServerFn(listRepOrders);

  const { data: reps = [] } = useQuery({ queryKey: ["ad-reps"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<RepRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  type OrderRow = Awaited<ReturnType<typeof ordersFn>>[number];
  const [orders, setOrders] = useState<Record<string, OrderRow[]>>({});

  const toggleExpand = async (rep: RepRow) => {
    if (expandedId === rep.id) { setExpandedId(null); return; }
    setExpandedId(rep.id);
    if (!orders[rep.id]) {
      try {
        const rows = await ordersFn({ data: { repId: rep.id } });
        setOrders((o) => ({ ...o, [rep.id]: rows }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load orders");
      }
    }
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["ad-reps"] });

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Users size={18} className="text-[#D4A24C]" />
        <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">Ad Reps ({reps.length})</h2>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto inline-flex items-center gap-1 bg-[#0F2A4A] text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#163864]"
        >
          <Plus size={12} /> Add Rep
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Sales</th>
              <th className="px-4 py-2">Discounts</th>
              <th className="px-4 py-2">Earned</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reps.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">No reps yet. Add one to start tracking commissions.</td></tr>
            )}
            {reps.map((r) => (
              <React.Fragment key={r.id}>
                <tr className="border-t border-gray-100">

                  <td className="px-4 py-2 font-medium text-[#0F2A4A]">
                    <button onClick={() => toggleExpand(r)} className="hover:underline">
                      {r.first_name} {r.last_name}
                    </button>
                    <div className="text-xs text-gray-500 font-normal">{r.email ?? "—"}{r.phone ? ` · ${r.phone}` : ""}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs bg-gray-50">{r.code}</td>
                  <td className="px-4 py-2 text-xs"><Percent size={10} className="inline" /> {r.commission_percent}%</td>
                  <td className="px-4 py-2 text-xs">{r.sales_count}</td>
                  <td className="px-4 py-2 text-xs text-gray-700">{fmt(r.discount_cents)}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-emerald-700">{fmt(r.commission_cents)}</td>
                  <td className="px-4 py-2">
                    {r.active ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <button onClick={() => setEditing(r)} className="text-[#0F2A4A] hover:text-[#163864] inline-flex items-center gap-1 text-xs">
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete rep "${r.first_name} ${r.last_name}"? Historical attributions will remain but the code will stop working.`)) return;
                          try {
                            await deleteFn({ data: { id: r.id } });
                            toast.success("Rep deleted");
                            refresh();
                          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                        }}
                        className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="text-xs font-semibold text-[#0F2A4A] mb-2 flex items-center gap-1.5">
                        <DollarSign size={12} /> Attributed orders
                      </div>
                      {(orders[r.id] ?? []).length === 0 ? (
                        <div className="text-xs text-gray-500">No paid orders yet.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="text-left py-1">Date</th>
                              <th className="text-left py-1">Email</th>
                              <th className="text-left py-1">Plan</th>
                              <th className="text-left py-1">Status</th>
                              <th className="text-right py-1">Charged</th>
                              <th className="text-right py-1">Discount</th>
                              <th className="text-right py-1">Commission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(orders[r.id] ?? []).map((o) => (
                              <tr key={o.id} className="border-t border-gray-200">
                                <td className="py-1">{new Date(o.paid_at ?? o.created_at).toLocaleDateString()}</td>
                                <td className="py-1">{o.customer_email}</td>
                                <td className="py-1">{o.plan}</td>
                                <td className="py-1">{o.status}</td>
                                <td className="py-1 text-right">{fmt(o.amount_cents)}</td>
                                <td className="py-1 text-right text-gray-600">{fmt(o.discount_cents ?? 0)}</td>
                                <td className="py-1 text-right font-semibold text-emerald-700">{fmt(o.commission_cents ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <RepFormModal
          rep={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (values) => {
            try {
              if (editing) {
                await updateFn({ data: { ...values, id: editing.id } });
                toast.success("Rep updated");
              } else {
                await createFn({ data: values });
                toast.success("Rep created");
              }
              setCreating(false); setEditing(null);
              refresh();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}
        />
      )}
    </section>
  );
}

function RepFormModal({
  rep,
  onClose,
  onSave,
}: {
  rep: RepRow | null;
  onClose: () => void;
  onSave: (v: {
    first_name: string; last_name: string; phone: string; email: string;
    code: string; commission_percent: number; active: boolean;
  }) => Promise<void>;
}) {
  const [first_name, setFirst] = useState(rep?.first_name ?? "");
  const [last_name, setLast] = useState(rep?.last_name ?? "");
  const [phone, setPhone] = useState(rep?.phone ?? "");
  const [email, setEmail] = useState(rep?.email ?? "");
  const [code, setCode] = useState(rep?.code ?? "");
  const [commission, setCommission] = useState(rep?.commission_percent ?? 20);
  const [active, setActive] = useState(rep?.active ?? true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (rep) return;
    if (!code && (first_name || last_name)) {
      setCode((first_name + last_name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
    }
     
  }, [first_name, last_name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ first_name, last_name, phone, email, code, commission_percent: Number(commission), active });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-bold text-[#0F2A4A]">{rep ? "Edit Rep" : "Add Ad Rep"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">First Name *</label>
              <input required value={first_name} onChange={(e) => setFirst(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Last Name *</label>
              <input required value={last_name} onChange={(e) => setLast(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Rep Code *</label>
            <input
              required value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono uppercase"
              placeholder="JOHNSMITH"
              minLength={3} maxLength={24}
            />
            <p className="text-xs text-gray-500 mt-1">Uppercase letters, numbers, - and _ only. Buyers enter this at checkout.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1">Commission %</label>
              <input
                type="number" min={0} max={100} step="0.01"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 pb-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={busy} className="flex-1 bg-[#D4A24C] text-[#0F2A4A] font-bold py-2.5 rounded-md hover:bg-[#e0b266] disabled:opacity-60">
              {busy ? "Saving…" : rep ? "Save changes" : "Create Rep"}
            </button>
            <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DesignOrdersSection() {
  const listFn = useServerFn(listDesignOrders);
  const deleteFn = useServerFn(deleteDesignOrder);
  const completeFn = useServerFn(setDesignOrderCompleted);
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["design-orders"],
    queryFn: () => listFn(),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCompleted = async (id: string, next: boolean) => {
    try {
      await completeFn({ data: { id, completed: next } });
      toast.success(next ? "Marked as completed" : "Marked as not completed");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (o: DesignOrderRow) => {
    const label = o.intake?.business_name || o.customer_email;
    if (!confirm(`Are you sure you want to delete the design order for "${label}"? This permanently removes the intake and cannot be undone.`)) return;
    try {
      await deleteFn({ data: { id: o.id } });
      toast.success("Design order deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Pencil size={18} className="text-[#D4A24C]" />
        <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">
          Custom Design Orders ({orders.length})
        </h2>
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-[#0F2A4A] hover:underline"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No paid design orders yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Intake</th>
                <th className="px-4 py-2" title="Design completed, submitted & approved">Completed</th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: DesignOrderRow) => {
                const isOpen = expandedId === o.id;
                const bn = o.intake?.business_name || "—";
                const completed = !!o.completed_at;
                return (
                  <React.Fragment key={o.id}>
                    <tr className={`border-t border-gray-100 ${completed ? "bg-emerald-50/40" : ""}`}>
                      <td className="px-4 py-2 font-medium text-[#0F2A4A]">{bn}</td>
                      <td className="px-4 py-2 text-xs text-gray-700">{o.customer_email}</td>
                      <td className="px-4 py-2">
                        {o.status === "intake_submitted" ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Intake received</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Awaiting intake</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {o.paid_at ? new Date(o.paid_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {o.intake_submitted_at ? new Date(o.intake_submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer" title="Design completed, submitted & approved">
                          <input
                            type="checkbox"
                            checked={completed}
                            onChange={(e) => toggleCompleted(o.id, e.target.checked)}
                            className="h-4 w-4 accent-emerald-600 cursor-pointer"
                          />
                          {completed && o.completed_at && (
                            <span className="text-[10px] text-emerald-700">
                              {new Date(o.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setExpandedId(isOpen ? null : o.id)}
                          className="text-xs text-[#0F2A4A] hover:underline"
                        >
                          {isOpen ? "Hide" : "View intake"}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => remove(o)}
                          className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/70 border-t border-gray-100">
                        <td colSpan={8} className="px-4 py-4">
                          {o.intake ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-700">
                              <IntakeRow label="Business" value={o.intake.business_name} />
                              <IntakeRow label="Owner" value={o.intake.owner_name} />

                              <IntakeRow label="Owner email" value={o.intake.owner_email} />
                              <IntakeRow label="Business email" value={o.intake.business_email} />
                              <IntakeRow label="Phone" value={o.intake.phone} />
                              <IntakeRow label="Website" value={o.intake.website_url} />
                              <IntakeRow label="Services" value={o.intake.services} />
                              <IntakeRow label="Tagline" value={o.intake.tagline} />
                              <IntakeRow label="Colors" value={o.intake.color_preferences} />
                              <IntakeRow label="Design brief" value={o.intake.design_brief} full />
                              <IntakeRow label="Notes" value={o.intake.notes} full />
                              <div className="md:col-span-2 pt-2 border-t border-gray-200">
                                <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Uploaded assets</div>
                                <div className="flex flex-wrap gap-3">
                                  {o.logo_url && (
                                    <a href={o.logo_url} target="_blank" rel="noreferrer" className="block">
                                      <img src={o.logo_url} alt="Logo" className="h-24 w-24 object-contain bg-white border border-gray-200 rounded-md" />
                                      <div className="text-[10px] text-gray-500 mt-1 text-center">Logo</div>
                                    </a>
                                  )}
                                  {(o.image_urls ?? []).map((u, i) => (
                                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                                      <img src={u} alt={`Reference ${i + 1}`} className="h-24 w-24 object-cover bg-white border border-gray-200 rounded-md" />
                                      <div className="text-[10px] text-gray-500 mt-1 text-center">Image {i + 1}</div>
                                    </a>
                                  ))}
                                  {!o.logo_url && (!o.image_urls || o.image_urls.length === 0) && (
                                    <div className="italic text-gray-500">No uploads.</div>
                                  )}
                                </div>
                              </div>
                              <div className="md:col-span-2 pt-2 text-[11px] text-gray-500">
                                Session: <span className="font-mono">{o.stripe_session_id}</span> · {o.environment}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs italic text-gray-500">
                              Customer paid but has not yet submitted the intake form.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function IntakeRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <span className="font-semibold text-[#0F2A4A]">{label}:</span>{" "}
      <span className="text-gray-700">{value?.trim() ? value : "—"}</span>
    </div>
  );
}
