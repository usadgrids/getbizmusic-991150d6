import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, ArrowLeft, Check, X, Clock, Shield, ExternalLink, Trash2, Plus, CreditCard, Upload, Pencil } from "lucide-react";
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
import { INDUSTRIES, AD_PLANS } from "@/lib/biz-utils";

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
  const filteredLiveAds = (() => {
    const raw = adsSearch.trim();
    if (!raw) return liveAds;
    const q = raw.toLowerCase();
    const numericQ = raw.replace(/^#/, "").trim();
    return liveAds.filter((a) => {
      const adNum = a.ad_number != null ? String(a.ad_number) : "";
      return (
        a.business_name.toLowerCase().includes(q) ||
        (a.industry ?? "").toLowerCase().includes(q) ||
        (numericQ.length > 0 && adNum.includes(numericQ))
      );
    });
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
              placeholder="Search by Business Name, Industry, or Ad # (e.g. 2911)"
              className="ml-auto w-full sm:w-96 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2A4A]/30"
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Business</th>
                  <th className="px-4 py-2">City</th>
                  <th className="px-4 py-2">Ad Number</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Expires</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLiveAds.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    {liveAds.length === 0 ? "No ads yet." : "No ads match your search."}
                  </td></tr>
                )}
                {filteredLiveAds.map((a) => {
                  const city = (a as unknown as { cities?: { name?: string; state?: string } | null }).cities;
                  const cityLabel = city?.name ? `${city.name}${city.state ? `, ${city.state}` : ""}` : "—";
                  return (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-[#0F2A4A]">{a.business_name}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{cityLabel}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700">#{a.ad_number ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {a.ad_type === "slider_10" ? "Featured · $24" : "Standard · $12"}
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
                              if (!confirm(`Remove "${a.business_name}" from rotation?`)) return;
                              try {
                                await removeFn({ data: { id: a.id } });
                                toast.success("Removed");
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
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
