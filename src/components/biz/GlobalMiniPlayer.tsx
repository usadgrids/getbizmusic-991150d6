import { useRouterState } from "@tanstack/react-router";
import { MiniPlayer } from "@/components/biz/MiniPlayer";

/**
 * Mounted once in the root route so the YouTube player instance is never
 * unmounted by client-side navigation. This keeps music playing when visitors
 * click "Submit Your Ad" and move through /pricing, /submit and checkout.
 *
 * The player stays mounted on every page so the same song keeps playing
 * uninterrupted while visitors browse.
 */
const HIDDEN_PREFIXES = ["/.lovable", "/lovable", "/api"];

export function GlobalMiniPlayer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <MiniPlayer />;
}
