import { createFileRoute, Link } from "@tanstack/react-router";
import { MEMBERSHIP_TERMS, MEMBERSHIP_TERMS_TITLE } from "@/lib/membership-terms";
import { BizFooter } from "@/components/biz/BizFooter";

const TITLE = "AI Business Alliance Membership Terms — Get Biz Music";
const DESCRIPTION =
  "Membership terms for the GetBizMusic AI Business Alliance: manual annual renewal with a reminder email, no auto-billing, no-refund policy, and Pay Later / Zelle / Venmo payment rules.";

export const Route = createFileRoute("/terms/membership")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://getbizmusic.com/terms/membership" }],
  }),
  component: MembershipTermsPage,
});

function MembershipTermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0F2A4A] text-white">
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="text-2xl font-bold text-[#D4A24C] sm:text-3xl">{MEMBERSHIP_TERMS_TITLE}</h1>
        <ol className="mt-6 space-y-5 text-sm leading-relaxed text-white/85">
          {MEMBERSHIP_TERMS.map((t, i) => (
            <li key={t.heading} className="flex gap-3">
              <span className="font-bold text-[#D4A24C]">{i + 1}.</span>
              <span>
                <strong className="text-white">{t.heading}</strong> {t.body}
              </span>
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
