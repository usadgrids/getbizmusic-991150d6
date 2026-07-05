import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_active_ads",
  title: "List active ads",
  description:
    "Return the currently active business ads shown in the BizSpot National City directory (business name, industry, tagline, website, ad type).",
  inputSchema: {
    industry: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional case-insensitive industry filter (exact match)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of ads to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ industry, limit }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Backend is not configured." }],
        isError: true,
      };
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let query = supabase
      .from("ads")
      .select("id,business_name,website_url,tagline,industry,ad_type,expires_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (industry) query = query.ilike("industry", industry);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { ads: rows, count: rows.length },
    };
  },
});
