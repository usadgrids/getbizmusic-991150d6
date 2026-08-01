import { useRouterState } from "@tanstack/react-router";
import { MiniPlayer } from "@/components/biz/MiniPlayer";

/**
 * Mounted once in the root route so the YouTube player instance is never
 * unmounted by client-side navigation. This keeps music playing when visitors
 * click "Submit Your Ad" and move through /pricing, /submit and checkout.
 *
 * Hidden on admin/auth surfaces where a floating player isn't wanted.
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

export function GlobalMiniPlayer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (hidden) return null;
  return <MiniPlayer />;
}
