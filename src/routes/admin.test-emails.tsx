import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Mail, Paperclip, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/ads.functions";
import { sendTestEmail } from "@/lib/email-test.functions";
import { EMAIL_TEST_CATALOG, EMAIL_TEST_GROUPS } from "@/lib/email-test-catalog";

export const Route = createFileRoute("/admin/test-emails")({
  head: () => ({
    meta: [
      { title: "Email QA Test Sends — Get Biz Music Admin" },
      {
        name: "description",
        content: "Admin-only tool to send a test copy of every Get Biz Music email template.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TestEmailsPage,
});

function TestEmailsPage() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const amIAdminFn = useServerFn(amIAdmin);
  const { data: roleData, isLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => amIAdminFn(),
    enabled: session === true,
  });

  if (session === null || (session && isLoading)) {
    return <Centered>Checking access…</Centered>;
  }
  if (!session || !roleData?.admin) {
    return (
      <Centered>
        <div className="bg-white rounded-2xl shadow-xl max-w-md p-6 text-center">
          <Shield className="mx-auto text-[#D4A24C] mb-3" size={36} />
          <h2 className="font-serif text-xl font-bold text-[#0F2A4A]">Admin access required</h2>
          <p className="text-sm text-gray-600 mt-2">
            Sign in with an admin account from the admin console to use the email tester.
          </p>
          <Link
            to="/admin"
            className="inline-block mt-5 bg-[#D4A24C] text-[#0F2A4A] font-semibold px-5 py-2 rounded-md hover:bg-[#e0b266]"
          >
            Go to Admin
          </Link>
        </div>
      </Centered>
    );
  }

  return <Tester />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4 text-gray-600 text-sm">
      {children}
    </div>
  );
}

type Result = {
  ok: boolean;
  subject?: string;
  attachment?: string;
  error?: string;
  at: string;
};

function Tester() {
  const sendFn = useServerFn(sendTestEmail);
  const [recipient, setRecipient] = useState("ralphposadas29@gmail.com");
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});

  const send = async (key: string) => {
    setBusy(key);
    try {
      const res = await sendFn({ data: { templateKey: key, recipientEmail: recipient.trim() } });
      setResults((r) => ({
        ...r,
        [key]: { ...res, at: new Date().toLocaleTimeString() },
      }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [key]: {
          ok: false,
          error: err instanceof Error ? err.message : "Send failed",
          at: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-[#0F2A4A] hover:underline">
          <ArrowLeft size={15} /> Back to Admin
        </Link>

        <h1 className="font-serif text-2xl font-bold text-[#0F2A4A] mt-3">Email QA — Test Sends</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Sends a real copy of each email using its built-in sample data, so it looks exactly as a
          customer would receive it. Subject lines are prefixed with <b>[TEST]</b>. Internal
          notification emails are redirected to the address below instead of the team inbox.
        </p>

        <div className="bg-white rounded-xl shadow-sm p-4 mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-[#0F2A4A]" htmlFor="test-recipient">
            Send all tests to
          </label>
          <input
            id="test-recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-[#0F2A4A]"
            placeholder="you@example.com"
          />
        </div>

        {EMAIL_TEST_GROUPS.map((group) => (
          <section key={group} className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{group}</h2>
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {EMAIL_TEST_CATALOG.filter((e) => e.group === group).map((entry) => {
                const res = results[entry.templateName];
                return (
                  <div key={entry.templateName} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#0F2A4A] text-sm">{entry.label}</span>
                        {entry.pdf && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#0F2A4A] text-white px-2 py-0.5 rounded-full">
                            <Paperclip size={11} /> PDF
                          </span>
                        )}
                        {entry.audience === "internal" && (
                          <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            Internal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{entry.when}</p>
                      <p className="text-[11px] text-gray-400 mt-1 font-mono">{entry.templateName}</p>

                      {res && (
                        <div
                          className={`mt-2 rounded-md px-3 py-2 text-xs ${
                            res.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            {res.ok ? <Check size={13} /> : <X size={13} />}
                            {res.ok ? `Sent at ${res.at}` : `Failed at ${res.at}`}
                          </div>
                          {res.subject && (
                            <div className="mt-1">
                              <span className="text-gray-500">Subject: </span>
                              [TEST] {res.subject}
                            </div>
                          )}
                          {res.ok && (
                            <div className="mt-0.5">
                              <span className="text-gray-500">Attachment: </span>
                              {res.attachment ?? "none"}
                            </div>
                          )}
                          {res.error && <div className="mt-1">{res.error}</div>}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => send(entry.templateName)}
                      disabled={busy !== null || !recipient.trim()}
                      className="shrink-0 inline-flex items-center gap-1.5 bg-[#D4A24C] text-[#0F2A4A] font-semibold text-sm px-4 py-2 rounded-md hover:bg-[#e0b266] disabled:opacity-50"
                    >
                      <Mail size={14} />
                      {busy === entry.templateName ? "Sending…" : "Send test"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-xs text-gray-500 mt-6">
          Every email the system can send is listed above. The claim audit-complete notification,
          membership Pay Later confirmation, and Pay Later cancellation notice are now wired into
          their real flows.
        </p>
      </div>
    </div>
  );
}
