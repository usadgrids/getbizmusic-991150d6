import { Link } from "@tanstack/react-router";
import { canUseAdDesign, DESIGN_PREVIEW_WATERMARK } from "@/lib/ai-audit-terms";

export type AdDesignClaim = {
  design_asset_url?: string | null;
  design_approved?: boolean | null;
  founding_member?: boolean | null;
  alliance_member?: boolean | null;
  alliance_membership_date?: string | null;
};

/**
 * Review surface for a business's free ad design. Until the claim is both
 * approved by the owner and covered by an active membership (terms rule #4),
 * the graphic is watermarked and no download/use is offered.
 */
export function AdDesignPreview({ claim }: { claim: AdDesignClaim }) {
  const url = claim.design_asset_url;
  if (!url) return null;
  const released = canUseAdDesign(claim);

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-xl border border-[#D4A24C]/40">
        <img
          src={url}
          alt="Your professionally designed ad graphic"
          className={released ? "block w-full" : "block w-full select-none"}
          draggable={released}
          onContextMenu={released ? undefined : (e) => e.preventDefault()}
        />
        {!released && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0F2A4A]/45"
          >
            <span className="-rotate-12 rounded-md border border-white/70 bg-black/45 px-3 py-2 text-center text-[11px] font-extrabold uppercase tracking-widest text-white sm:text-sm">
              {DESIGN_PREVIEW_WATERMARK}
            </span>
          </div>
        )}
      </div>

      {released ? (
        <a
          href={url}
          download
          className="mt-3 inline-flex rounded-full bg-[#D4A24C] px-5 py-2 text-sm font-bold text-[#0F2A4A]"
        >
          Download my ad graphic
        </a>
      ) : (
        <p className="mt-3 text-xs text-white/70">
          This design is a free preview. It can be downloaded, published, or used once you approve
          it and your AI Business Alliance Membership is active.{" "}
          <Link to="/terms/ai-audit" className="underline text-[#D4A24C]">
            Terms &amp; Conditions apply
          </Link>
          .
        </p>
      )}
    </div>
  );
}
