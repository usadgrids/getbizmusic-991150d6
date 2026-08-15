import { Link } from "@tanstack/react-router";
import heroFlyer from "@/assets/biz-hero-b2b.png.asset.json";

type Props = {
  cityName?: string;
  state?: string;
  imageUrl?: string;
  imageAlt?: string;
  hideImage?: boolean;
};

export function BizHero({ cityName, state, imageUrl, imageAlt, hideImage }: Props) {
  const label = cityName ? `${cityName}${state ? `, ${state}` : ""}` : null;
  return (
    <header className="relative bg-[#0F2A4A]">
      {label && (
        <div className="w-full bg-gradient-to-r from-[#FFD700] via-[#FFC300] to-[#FFB300] text-[#0F2A4A]">
          <div className="mx-auto max-w-[1400px] px-4 py-2 sm:py-3 text-center">
            <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              Get Biz Music
            </span>
            <span className="block text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {label}
            </span>
          </div>
        </div>
      )}
      {hideImage ? null : (
      <div className="relative mx-auto w-full max-w-[1400px]">
        <Link
          to="/pricing"
          aria-label={label ? `Get Listed in ${label} — From $12/yr` : "Get Listed — From $12/yr"}
          className="block"
        >
          <img
            src={imageUrl ?? heroFlyer.url}
            alt={
              imageAlt ??
              (label
                ? `Get Biz Music ${label} — Local B2B Business Network with Music Streaming. Get listed from $12/year.`
                : "Get Biz Music — Local B2B Business Network with Music Streaming. Get listed from $12/year.")
            }
            className="block w-full h-auto"
          />
        </Link>
      </div>
      )}
    </header>
  );
}
