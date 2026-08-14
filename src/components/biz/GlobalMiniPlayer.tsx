import { useRouterState } from "@tanstack/react-router";
import { MiniPlayer } from "@/components/biz/MiniPlayer";
import { isDirectoryCategory } from "@/lib/directory-categories";

/**
 * Mounted once in the root route so the YouTube player instance is never
 * unmounted by client-side navigation. This keeps music playing when visitors
 * click "Submit Your Ad" and move through /pricing, /submit and checkout.
 *
 * Hidden on admin/auth surfaces and on GetBizMusic Knowledge Graph listing
 * pages (/<category>/<slug>) where a floating music player isn't wanted.
 */
const HIDDEN_PREFIXES = [
  "/admin",
  "/auth",
  "/reset-password",
  "/edit-ad",
  "/.lovable",
  "/lovable",
  "/api",
];

/** A Knowledge Graph listing page looks like /<category>/<slug> (e.g. /beauty/cut-and-dye-salon). */
function isKnowledgeGraphPage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  if (segments[1] === "activate") return false; // /<category>/activate is the activation flow
  return isDirectoryCategory(segments[0]);
}

export function GlobalMiniPlayer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden =
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    isKnowledgeGraphPage(pathname);
  if (hidden) return null;
  return <MiniPlayer />;
}
