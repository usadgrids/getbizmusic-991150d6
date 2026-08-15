import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { BizNavbar } from "@/components/biz/BizNavbar";
import { BizFooter } from "@/components/biz/BizFooter";
import { ALLIANCE_BENEFITS, ALLIANCE_TERMS } from "@/lib/alliance";

const PAGE_URL = "https://getbizmusic.com/alliance";
const TITLE = "AI Business Alliance — GetBizMusic.com Membership";
const DESCRIPTION =
  "Join the GetBizMusic.com AI Business Alliance: get recommended by AI tools, reach music-streaming consumers, get professional ad design, and build verified business trust. $49.95 annual launch price.";

export const Route = createFileRoute("/alliance")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GetBizMusic.com AI Business Alliance",
          url: PAGE_URL,
          description: DESCRIPTION,
          email: "ralph@getbizmusic.com",
          telephone: "+1-619-707-0467",
          makesOffer: {
            "@type": "Offer",
            name: "AI Business Alliance Annual Membership",
            price: "49.95",
            priceCurrency: "USD",
            category: "Annual membership",
            url: PAGE_URL,
          },
        }),
      },
    ],
  }),
  component: AlliancePage,
});

function AlliancePage() {
  return (
    <div className="min-h-screen bg-[#0F2A4A] text-white font-['Manrope'] overflow-x-hidden">
      <BizNavbar />

      <header className="mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A24C]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C430] mb-5">
          <Sparkles size={14} />
          AI Visibility Alliance
        </div>
        <h1 className="font-['Sora'] text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
          GetBizMusic.com <span className="text-[#F4C430]">AI Business Alliance</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-white/80">
          Increase Visibility. Build Credibility. Grow with AI.
        </p>
        <p className="mt-4 mx-auto max-w-2xl text-sm sm:text-base text-white/65">
          Join the Alliance and get seen, recommended, and trusted by AI tools, consumers, and
          business partners.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        {/* Our goals */}
        <section aria-labelledby="goals-heading">
          <h2 id="goals-heading" className="font-['Sora'] text-2xl sm:text-3xl font-bold">
            Our Goals
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ALLIANCE_BENEFITS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-[#153a66]/50 p-6 transition-colors hover:border-[#D4A24C]/60"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4A24C]/15 text-[#F4C430]">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-['Sora'] text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who can join + terms */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <section
            aria-labelledby="who-heading"
            className="rounded-2xl border border-white/10 bg-[#153a66]/50 p-7"
          >
            <h2 id="who-heading" className="font-['Sora'] text-xl font-bold">
              Who Can Join
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Verified local businesses, B2B providers, and licensed independent professionals in
              good standing.
            </p>
          </section>

          <section
            aria-labelledby="terms-heading"
            className="rounded-2xl border border-white/10 bg-[#153a66]/50 p-7"
          >
            <h2 id="terms-heading" className="font-['Sora'] text-xl font-bold">
              Alliance Terms
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/75">
              {ALLIANCE_TERMS.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#D4A24C]" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Membership fees */}
        <section
          aria-labelledby="fees-heading"
          className="mt-14 rounded-3xl border border-[#D4A24C]/40 bg-gradient-to-br from-[#153a66] via-[#0F2A4A] to-[#153a66] p-8 sm:p-10 text-center"
        >
          <h2 id="fees-heading" className="font-['Sora'] text-2xl sm:text-3xl font-bold">
            Membership Fees
          </h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#F4C430]">
            Special Launch Price
          </p>
          <p className="mt-2 font-['Sora'] text-4xl sm:text-5xl font-extrabold text-[#F4C430]">
            $49.95
            <span className="ml-2 align-middle text-base font-semibold text-white/70">
              / annual membership
            </span>
          </p>
          <Link
            to="/pricing"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A24C] px-8 py-3 text-sm font-bold text-[#0F2A4A] shadow-md transition-transform hover:scale-105 hover:bg-[#F4C430]"
          >
            Join the Alliance
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs text-white/45">Prices subject to change without notice.</p>
        </section>

        {/* Contact */}
        <section
          aria-labelledby="contact-heading"
          className="mt-10 rounded-2xl border border-white/10 bg-[#153a66]/50 p-7 text-center"
        >
          <h2 id="contact-heading" className="font-['Sora'] text-xl font-bold">
            Ralph T. Posadas
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#D4A24C]">President</p>
          <p className="mt-4 mx-auto max-w-2xl text-sm text-white/70">
            Our mission is to help businesses increase their visibility, build credibility, and grow
            through AI search, music streaming, and trusted partnerships.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:ralph@getbizmusic.com"
              className="inline-flex items-center gap-2 rounded-full border border-[#D4A24C]/50 px-5 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#D4A24C]/10"
            >
              <Mail size={15} />
              ralph@getbizmusic.com
            </a>
            <a
              href="sms:+16197070467"
              className="inline-flex items-center gap-2 rounded-full border border-[#D4A24C]/50 px-5 py-2 text-sm font-semibold text-[#D4A24C] hover:bg-[#D4A24C]/10"
            >
              <MessageSquare size={15} />
              Text/SMS (619) 707-0467
            </a>
          </div>
        </section>
      </main>

      <BizFooter />
    </div>
  );
}
