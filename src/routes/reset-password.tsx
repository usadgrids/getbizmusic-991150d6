import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — BizSpot Directory" },
      { name: "description", content: "Set a new password for your admin account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash on load
    // and fires PASSWORD_RECOVERY when the session is ready.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
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
          <h2 className="font-bold text-lg text-[#0F2A4A]">Set New Password</h2>
        </div>

        {!ready ? (
          <p className="text-sm text-gray-600">
            Open this page from the password reset link in your email. If you got here by mistake,{" "}
            <Link to="/admin" className="text-[#0F2A4A] underline">go back to sign in</Link>.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
            <input
              type="password" required minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#0F2A4A] text-white rounded-md py-2 font-semibold hover:bg-[#163864] disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link to="/admin" className="text-xs text-gray-500 hover:text-[#0F2A4A] inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
