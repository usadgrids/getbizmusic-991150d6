import { Link } from "@tanstack/react-router";
import { openCookiePreferences } from "./CookieConsent";

export function BizFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#0F2A4A] text-white/80 text-xs py-8 px-4 mt-12 border-t border-[#D4A24C]/30 overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-6 min-w-0">
        {/* Top row: brand + quick links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="break-words font-semibold text-white">
            Get Biz Music — National City, CA · Nationwide USA Business Advertising
          </div>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-white/70">
            <Link to="/" hash="terms" className="hover:text-[#D4A24C]">Terms</Link>
            <Link to="/" hash="privacy" className="hover:text-[#D4A24C]">Privacy</Link>
            <Link to="/" hash="can-spam" className="hover:text-[#D4A24C]">CAN-SPAM</Link>
            <Link to="/" hash="ai-disclosure" className="hover:text-[#D4A24C]">AI Disclosure</Link>
            <Link to="/" hash="accessibility" className="hover:text-[#D4A24C]">Accessibility</Link>
            <Link to="/" hash="contact" className="hover:text-[#D4A24C]">Contact</Link>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="hover:text-[#D4A24C] underline-offset-2 hover:underline"
            >
              Cookie preferences
            </button>
          </nav>
        </div>

        {/* Legal disclosures */}
        <div className="grid gap-5 md:grid-cols-2 text-left text-white/70 leading-relaxed">
          <section id="terms">
            <h3 className="text-white font-semibold mb-1">Terms &amp; Conditions</h3>
            <p>
              By accessing or using getbizmusic.com (the "Site"), you agree to these Terms.
              All ads are subject to review and may be rejected or removed at our sole discretion.
              We do not endorse or guarantee any advertiser, product, or service listed. Advertisers
              are solely responsible for the accuracy, legality, and content of their submissions
              and for holding all necessary rights, licenses, and permissions. No adult, illegal,
              deceptive, discriminatory, or misleading content is permitted. Fees paid for ad
              placements are non-refundable except where required by law. We may modify, suspend,
              or terminate the Site or any listing at any time without notice. To the maximum
              extent permitted by law, the Site is provided "as is" without warranties of any
              kind, and Get Biz Music, its owners, and affiliates disclaim all liability for
              indirect, incidental, or consequential damages. These Terms are governed by the
              laws of the State of California, USA.
            </p>
          </section>

          <section id="privacy">
            <h3 className="text-white font-semibold mb-1">Privacy Notice</h3>
            <p>
              We collect only the information needed to operate the Site and process ad
              submissions (e.g., name, business info, email, payment tokens via our processor,
              and basic analytics). We do not sell your personal information. Under the
              California Consumer Privacy Act (CCPA/CPRA), California residents have the right
              to know, access, correct, delete, and limit the use of their personal information,
              and to opt out of sale/sharing (we do not sell). EU/UK visitors have rights under
              GDPR/UK-GDPR including access, rectification, erasure, and portability. Children
              under 13 are not permitted to submit information (COPPA). To exercise any right,
              email <a href="mailto:adsupport@getbizmusic.com" className="underline">adsupport@getbizmusic.com</a>.
            </p>
          </section>

          <section id="can-spam">
            <h3 className="text-white font-semibold mb-1">CAN-SPAM Act Compliance</h3>
            <p>
              Any commercial email we send complies with the U.S. CAN-SPAM Act of 2003. We do
              not use false or misleading headers or deceptive subject lines, we identify
              commercial messages as advertisements where required, include our valid physical
              postal address, and honor opt-out requests promptly (within 10 business days).
              To unsubscribe from marketing email, use the link in any message or email
              <a href="mailto:adsupport@getbizmusic.com" className="underline"> adsupport@getbizmusic.com</a>.
            </p>
          </section>

          <section id="ai-disclosure">
            <h3 className="text-white font-semibold mb-1">AI Transparency Disclosure (California AI Laws)</h3>
            <p>
              In compliance with California's AI transparency and disclosure laws — including
              the California AI Transparency Act (SB 942), the Generative AI Training Data
              Transparency Act (AB 2013), the Bot Disclosure Law (SB 1001), and AB 2655 /
              AB 2355 relating to AI-generated content and political advertising — we
              disclose that portions of the Site's content, imagery, audio, or automated
              responses may be created or assisted by generative AI. Automated chat or
              response tools, if any, are not human. AI-generated media may include
              provenance metadata where feasible. We do not knowingly use AI to create
              deceptive deepfakes of real persons. Advertisers using AI-generated content
              must comply with all applicable disclosure laws.
            </p>
          </section>

          <section id="accessibility">
            <h3 className="text-white font-semibold mb-1">Accessibility (ADA / Section 508)</h3>
            <p>
              We strive to conform to WCAG 2.1 AA and the Americans with Disabilities Act.
              If you experience a barrier accessing any part of the Site, contact
              <a href="mailto:adsupport@getbizmusic.com" className="underline"> adsupport@getbizmusic.com</a>
              and we will work to provide the information or service through an alternative
              method.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1">Additional Federal Notices</h3>
            <p>
              <strong>DMCA:</strong> To report copyright infringement under the Digital
              Millennium Copyright Act (17 U.S.C. §512), send a notice with the required
              elements to <a href="mailto:adsupport@getbizmusic.com" className="underline">adsupport@getbizmusic.com</a>.
              {" "}<strong>FTC Endorsement Guides:</strong> Advertisers must clearly and
              conspicuously disclose material connections. <strong>Truth-in-Advertising:</strong>
              All ads must be truthful, non-deceptive, and substantiated (15 U.S.C. §45).
              {" "}<strong>Section 230:</strong> As an interactive computer service, we are
              not the publisher or speaker of information provided by users (47 U.S.C. §230).
              {" "}<strong>Fair Housing / ECOA:</strong> Ads for housing, credit, or
              employment must comply with anti-discrimination laws.
              {" "}<strong>TCPA:</strong> No calls or texts are sent without prior express
              consent. <strong>PCI-DSS:</strong> Payments are handled by PCI-compliant
              third-party processors; we do not store full card numbers.
            </p>
          </section>

          <section id="contact" className="md:col-span-2">
            <h3 className="text-white font-semibold mb-1">Contact</h3>
            <p>
              Get Biz Music · National City, CA, USA · Email:{" "}
              <a href="mailto:adsupport@getbizmusic.com" className="underline text-[#D4A24C]">
                adsupport@getbizmusic.com
              </a>
            </p>
          </section>
        </div>

        <div className="text-center text-white/50 border-t border-white/10 pt-4 break-words">
          © {year} Get Biz Music. All rights reserved. All ads reviewed by our team. No adult,
          illegal, or misleading content. This page is maintained by Get Biz Music and provided
          for general information only; it is not legal advice.
        </div>
      </div>
    </footer>
  );
}
