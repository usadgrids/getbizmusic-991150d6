import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

/**
 * Small, right-side floating "back to home" CTA shown on category pages and
 * unique Knowledge Graph / ad URLs so visitors can jump home quickly without
 * scrolling to the top. Sized to be visible without dominating the screen.
 */
export function FloatingHomeButton() {
  return (
    <Link
      to="/"
      aria-label="Back to home"
      className="fixed z-40 right-3 bottom-3 sm:right-5 sm:bottom-5 inline-flex items-center gap-1.5 rounded-full bg-[#0F2A4A] text-[#D4A24C] border border-[#D4A24C]/40 px-3.5 py-2 text-xs font-semibold shadow-lg shadow-black/20 transition-transform hover:scale-105 hover:bg-[#0F2A4A]/95"
    >
      <Home size={14} />
      <span className="hidden xs:inline sm:inline">Home</span>
    </Link>
  );
}
