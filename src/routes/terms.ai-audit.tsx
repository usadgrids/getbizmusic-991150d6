import { createFileRoute, Link } from "@tanstack/react-router";
import { AI_AUDIT_TERMS, AI_AUDIT_TERMS_TITLE } from "@/lib/ai-audit-terms";
import { BizFooter } from "@/components/biz/BizFooter";

export const Route = createFileRoute("/terms/ai-audit")({
  head: () => ({
    meta: [
      { title: "AI Visibility Audit & Free Ad Design Terms — Get Biz Music" },
      {
        name: "description",
        content:
          "Terms and conditions for the free GetBizMusic AI Visibility Audit and complimentary professional ad design, including preview-only usage rules and membership pricing.",
      },
      {
        property: "og:title",
        content: "AI Visibility Audit & Free Ad Design Terms — Get Biz Music",
      },
      {
        property: "og:description",
        content:
          "How the free AI Visibility Audit and free ad design work, what we implement, and when a finished ad graphic may be used.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/terms/ai-audit" }],
  }),
  component: AiAuditTermsPage,
});

function AiAuditTermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0F2A4A] text-white">
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold text-[#D4A24C] sm:text-3xl">{AI_AUDIT_TERMS_TITLE}</h1>
        <ol className="mt-6 space-y-5 text-sm leading-relaxed text-white/85">
          {AI_AUDIT_TERMS.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-bold text-[#D4A24C]">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <Link
          to="/"
          className="mt-8 inline-block rounded-full border border-[#D4A24C]/60 px-5 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#D4A24C]/10"
        >
          ← Back to Get Biz Music
        </Link>
      </main>
      <BizFooter />
    </div>
  );
}
