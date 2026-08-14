import { useEffect, useState, type MouseEvent } from "react";
import { Facebook, Linkedin, MessageCircle, Share2, Link as LinkIcon, Check } from "lucide-react";

interface Props {
  /** Absolute URL of the page being shared. */
  url: string;
  /** Share sheet title. */
  title: string;
  /** Short share text. */
  text: string;
  label?: string;
  compact?: boolean;
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.545 8.62L22.75 22h-6.99l-5.478-6.85L3.9 22H.643l8.08-9.23L1 2h7.164l4.95 6.22L18.244 2Zm-2.45 18h1.87L7.29 4H5.29l10.504 16Z" />
    </svg>
  );
}

/**
 * Native-first share bar for whole pages (category hubs, listing pages).
 * Uses the Web Share API on mobile, falls back to real outbound share URLs.
 */
export function PageShareBar({ url, title, text, label = "Share this page", compact = true }: Props) {
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasWebShare, setHasWebShare] = useState(false);

  const facebookUrl = `${isMobile ? "https://m.facebook.com" : "https://www.facebook.com"}/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const whatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const update = () =>
      setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || media.matches);
    update();
    media.addEventListener("change", update);
    setHasWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => media.removeEventListener("change", update);
  }, []);

  const tryWebShare = async (): Promise<boolean> => {
    if (!hasWebShare || typeof navigator.share !== "function") return false;
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return true;
      return false;
    }
  };

  const handleShareLink = async (event: MouseEvent<HTMLAnchorElement>, fallbackHref: string) => {
    if (!isMobile) return; // desktop: let the anchor open the network's share window
    event.preventDefault();
    if (await tryWebShare()) return;
    window.location.assign(fallbackHref);
  };

  const nativeShare = async () => {
    if (await tryWebShare()) return;
    window.location.assign(facebookUrl);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const btn =
    "rounded-full flex items-center justify-center text-white shadow-md transition hover:scale-105 active:scale-95";
  const sz = compact ? "w-8 h-8" : "w-9 h-9";

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#0F2A4A]/15 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-semibold text-[#0F2A4A]">{label}</div>
      <div className="flex items-center gap-1.5" role="group" aria-label={label}>
        <a href={facebookUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer"
          onClick={(e) => handleShareLink(e, facebookUrl)} aria-label="Share on Facebook"
          className={`${btn} ${sz} bg-[#1877F2]`}>
          <Facebook size={compact ? 14 : 16} />
        </a>
        <a href={twitterUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer"
          onClick={(e) => handleShareLink(e, twitterUrl)} aria-label="Share on X"
          className={`${btn} ${sz} bg-black`}>
          <XIcon size={compact ? 12 : 14} />
        </a>
        <a href={linkedInUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer"
          onClick={(e) => handleShareLink(e, linkedInUrl)} aria-label="Share on LinkedIn"
          className={`${btn} ${sz} bg-[#0A66C2]`}>
          <Linkedin size={compact ? 14 : 16} />
        </a>
        <a href={whatsAppUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer"
          onClick={(e) => handleShareLink(e, whatsAppUrl)} aria-label="Share on WhatsApp"
          className={`${btn} ${sz} bg-[#25D366]`}>
          <MessageCircle size={compact ? 14 : 16} />
        </a>
        <button type="button" onClick={copyLink} aria-label="Copy link"
          className={`${btn} ${sz} bg-[#0F2A4A]`}>
          {copied ? <Check size={compact ? 14 : 16} /> : <LinkIcon size={compact ? 14 : 16} />}
        </button>
        <button type="button" onClick={nativeShare} aria-label="More sharing options"
          className={`${btn} ${sz} bg-[#D4A24C] text-[#0F2A4A]`}>
          <Share2 size={compact ? 14 : 16} />
        </button>
      </div>
    </div>
  );
}
