import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, ArrowLeft, Check, X, Clock, Shield, ExternalLink, Trash2, Plus, CreditCard, Upload } from "lucide-react";
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
} from "@/lib/ads.functions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { INDUSTRIES, AD_PLANS } from "@/lib/biz-utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BizSpot Directory - National City" },
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
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-[1200/628] bg-gray-100">
                    {s.preview_url && (
                      <img src={s.preview_url} alt={s.business_name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="font-serif text-lg font-bold text-[#0F2A4A]">{s.business_name}</div>
                    <div className="text-xs text-gray-500">
                      {s.industry} · {s.ad_type === "slider_10" ? "Featured Slider ($12)" : "Standard ($12)"}
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
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={async () => {
                          try {
                            await approveFn({ data: { id: s.id } });
                            toast.success("Approved — ad is now live for 1 year");
                            refreshAll();
                          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                        }}
                        className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-md hover:bg-emerald-700 inline-flex items-center justify-center gap-1"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={async () => {
                          const reason = window.prompt("Rejection reason (optional)") ?? undefined;
                          try {
                            await rejectFn({ data: { id: s.id, reason } });
                            toast.success("Rejected");
                            refreshAll();
                          } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                        }}
                        className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-700 inline-flex items-center justify-center gap-1"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live ads */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Check size={18} className="text-emerald-600" />
            <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">
              Currently Running ({liveAds.filter((a) => a.status === "active").length})
            </h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Business</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Expires</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {liveAds.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No ads yet.</td></tr>
                )}
                {liveAds.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-[#0F2A4A]">{a.business_name}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {a.ad_type === "slider_10" ? "Featured · $12" : "Standard · $12"}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
