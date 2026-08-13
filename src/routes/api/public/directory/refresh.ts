import { createFileRoute } from "@tanstack/react-router";

// Scheduled re-crawl of the stalest listings. Guarded by a shared secret so
// only our scheduler can trigger it.
export const Route = createFileRoute("/api/public/directory/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["DIRECTORY_REFRESH_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const provided =
          request.headers.get("x-refresh-secret") ??
          new URL(request.url).searchParams.get("secret") ??
          "";
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 5) || 5, 10);
        const { refreshStalePlaces } = await import("@/lib/directory.server");
        const results = await refreshStalePlaces(limit);
        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
