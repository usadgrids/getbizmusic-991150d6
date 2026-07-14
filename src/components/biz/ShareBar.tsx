import { useState } from "react";
import { Facebook, Linkedin, MessageCircle, Share2, Link as LinkIcon, Check } from "lucide-react";

const SITE = "https://www.getbizmusic.com";

interface Props {
  adNumber: number | null;
  businessName: string;
  tagline?: string | null;
  onOpen?: () => void; // called when a share action starts (e.g. pause the slider)
  compact?: boolean;
}

// X (Twitter) glyph — lucide has no X icon, tiny inline SVG.
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.545 8.62L22.75 22h-6.99l-5.478-6.85L3.9 22H.643l8.08-9.23L1 2h7.164l4.95 6.22L18.244 2Zm-2.45 18h1.87L7.29 4H5.29l10.504 16Z" />
    </svg>
  );
}

export function ShareBar({ adNumber, businessName, tagline, onOpen, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  if (adNumber == null) return null;

  const url = `${SITE}/ad/${adNumber}?v=${Date.now()}`;
  const text = tagline ? `${businessName} — ${tagline}` : businessName;

  const open = (u: string) => {
    onOpen?.();
    // On mobile, popup windows with size features are blocked. Use a plain
    // new-tab open, and fall back to same-tab navigation if the browser
    // still blocks it.
    const isMobile =
      typeof window !== "undefined" &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.matchMedia("(max-width: 768px)").matches);
    const win = isMobile
      ? window.open(u, "_blank", "noopener,noreferrer")
      : window.open(u, "_blank", "noopener,noreferrer,width=680,height=640");
    if (!win) window.location.href = u;
  };

  const shareFacebook = () =>
    open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  const shareTwitter = () =>
    open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
        text,
      )}`,
    );
  const shareLinkedIn = () =>
    open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
  const shareWhatsApp = () =>
    open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`);

  const nativeShare = async () => {
    onOpen?.();
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      shareFacebook();
    }
  };

  const copyLink = async () => {
    onOpen?.();
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
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="group"
      aria-label={`Share ad #${adNumber}`}
    >
      <button type="button" onClick={shareFacebook} aria-label="Share on Facebook"
        className={`${btn} ${sz} bg-[#1877F2]`}>
        <Facebook size={compact ? 14 : 16} />
      </button>
      <button type="button" onClick={shareTwitter} aria-label="Share on X"
        className={`${btn} ${sz} bg-black`}>
        <XIcon size={compact ? 12 : 14} />
      </button>
      <button type="button" onClick={shareLinkedIn} aria-label="Share on LinkedIn"
        className={`${btn} ${sz} bg-[#0A66C2]`}>
        <Linkedin size={compact ? 14 : 16} />
      </button>
      <button type="button" onClick={shareWhatsApp} aria-label="Share on WhatsApp"
        className={`${btn} ${sz} bg-[#25D366]`}>
        <MessageCircle size={compact ? 14 : 16} />
      </button>
      <button type="button" onClick={copyLink} aria-label="Copy link"
        className={`${btn} ${sz} bg-[#0F2A4A]`}>
        {copied ? <Check size={compact ? 14 : 16} /> : <LinkIcon size={compact ? 14 : 16} />}
      </button>
      <button type="button" onClick={nativeShare} aria-label="More sharing options"
        className={`${btn} ${sz} bg-[#D4A24C] text-[#0F2A4A]`}>
        <Share2 size={compact ? 14 : 16} />
      </button>
    </div>
  );
}
