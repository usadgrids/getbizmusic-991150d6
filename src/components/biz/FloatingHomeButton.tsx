import { Link } from "@tanstack/react-router";
import { Home, ArrowLeft } from "lucide-react";

/**
 * Small, right-side floating nav buttons shown on category pages and unique
 * Knowledge Graph / ad URLs so visitors can jump home or go back quickly.
 * The two buttons stack vertically centered on the right edge: Home on top,
 * Back below it.
 */
export function FloatingHomeButton() {
  return (
    <Link
      to="/"
      aria-label="Back to home"
      className="fixed z-40 right-3 top-1/2 -translate-y-[calc(100%+0.25rem)] sm:right-5 inline-flex flex-col items-center gap-1 rounded-full bg-[#0F2A4A] text-[#D4A24C] border border-[#D4A24C]/40 px-2.5 py-3 text-xs font-semibold shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-[#0F2A4A]/95"
    >
      <Home size={16} />
      <span className="hidden xs:inline sm:inline">Home</span>
    </Link>
  );
}

export function FloatingBackButton() {
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "/";
        }
      }}
      className="fixed z-40 right-3 top-1/2 translate-y-[0.25rem] sm:right-5 inline-flex flex-col items-center gap-1 rounded-full bg-[#0F2A4A] text-[#D4A24C] border border-[#D4A24C]/40 px-2.5 py-3 text-xs font-semibold shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-[#0F2A4A]/95 cursor-pointer"
    >
      <ArrowLeft size={16} />
      <span className="hidden xs:inline sm:inline">Back</span>
    </button>
  );
}
