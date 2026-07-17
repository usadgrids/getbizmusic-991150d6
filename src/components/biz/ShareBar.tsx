import { useEffect, useState } from "react";
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
  const [nativeImageFile, setNativeImageFile] = useState<File | null>(null);
  if (adNumber == null) return null;

  const url = `${SITE}/ad/${adNumber}`;
  const text = tagline ? `${businessName} — ${tagline}` : businessName;
  const shareImageUrl = `/api/public/ad-image/${adNumber}`;

  const isMobile =
    typeof window !== "undefined" &&
    (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.matchMedia("(max-width: 768px)").matches);
  const facebookUrl = `${isMobile ? "https://m.facebook.com" : "https://www.facebook.com"}/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    text,
  )}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const whatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`;

  useEffect(() => {
    let cancelled = false;
    if (
      typeof window === "undefined" ||
      typeof File === "undefined" ||
      typeof navigator.canShare !== "function"
    ) {
      setNativeImageFile(null);
      return;
    }

    setNativeImageFile(null);
    fetch(shareImageUrl, { cache: "force-cache", credentials: "omit" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob || !blob.type.startsWith("image/")) return;
        const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
        const file = new File([blob], `ad-${adNumber}.${ext}`, { type: blob.type || "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) setNativeImageFile(file);
      })
      .catch(() => {
        if (!cancelled) setNativeImageFile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [adNumber, shareImageUrl]);

  const pauseAfterShareStarts = () => {
    window.setTimeout(() => onOpen?.(), 0);
  };

  const handleLinkShare = (event?: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile && event) {
      event.preventDefault();
      window.location.assign(event.currentTarget.href);
    }
    pauseAfterShareStarts();
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        const withImage = nativeImageFile
          ? { title: businessName, text: `${text}\n${url}`, url, files: [nativeImageFile] }
          : null;
        const shareData =
          withImage && (!navigator.canShare || navigator.canShare(withImage))
            ? withImage
            : { title: businessName, text, url };
        const sharePromise = navigator.share(shareData);
        pauseAfterShareStarts();
        await sharePromise;
      } catch {
        /* user cancelled */
      }
    } else {
      window.location.assign(facebookUrl);
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
      <a href={facebookUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer" onClick={handleLinkShare} aria-label="Share on Facebook"
        className={`${btn} ${sz} bg-[#1877F2]`}>
        <Facebook size={compact ? 14 : 16} />
      </a>
      <a href={twitterUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer" onClick={handleLinkShare} aria-label="Share on X"
        className={`${btn} ${sz} bg-black`}>
        <XIcon size={compact ? 12 : 14} />
      </a>
      <a href={linkedInUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer" onClick={handleLinkShare} aria-label="Share on LinkedIn"
        className={`${btn} ${sz} bg-[#0A66C2]`}>
        <Linkedin size={compact ? 14 : 16} />
      </a>
      <a href={whatsAppUrl} target={isMobile ? undefined : "_blank"} rel="noopener noreferrer" onClick={handleLinkShare} aria-label="Share on WhatsApp"
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
  );
}
