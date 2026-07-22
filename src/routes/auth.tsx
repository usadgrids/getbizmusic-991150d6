import { createFileRoute, redirect } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const target = safeNext(search.next);
      throw redirect({ href: target });
    }
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Get Biz Music" },
      { name: "description", content: "Sign in to your Get Biz Music account." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function safeNext(next: string | undefined): string {
  if (!next) return "/";
  // Only allow same-origin relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function AuthPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) window.location.href = safeNext(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [next]);

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
          options: { emailRedirectTo: window.location.origin + safeNext(next) },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then sign in.");
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
          <h2 className="font-bold text-lg text-[#0F2A4A]">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h2>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A24C]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F2A4A] text-white rounded-md py-2 font-semibold hover:bg-[#163864] disabled:opacity-60"
          >
            {loading ? "Working…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-gray-500 hover:text-[#0F2A4A]"
          >
            {mode === "signin"
              ? "First time? Create an account →"
              : "← Back to sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
