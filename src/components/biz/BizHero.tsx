import { Link } from "@tanstack/react-router";
import heroFlyer from "@/assets/biz-hero-flyer.jpg.asset.json";

export function BizHero() {
  return (
    <header className="relative bg-[#0F2A4A]">
      <div className="relative mx-auto w-full max-w-[1400px]">
        <Link
          to="/pricing"
          aria-label="Get Listed — From $12/yr"
          className="block"
        >
          <img
            src={heroFlyer.url}
            alt="Get Biz Music National City — Novelty Business Ads with Music Streaming. Get your business seen every day, all year long for just $12. www.getbizmusic.com"
            className="block w-full h-auto"
          />
        </Link>
      </div>
    </header>
  );
}
