import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listActiveAds from "./tools/list-active-ads";
import getPricing from "./tools/get-pricing";

// OAuth issuer MUST be the direct Supabase host — the .lovable.cloud proxy is
// rejected by mcp-js on RFC 8414 issuer mismatch. Read the project ref from
// import.meta.env so Vite inlines it at build; fallback keeps the URL
// well-formed during the manifest-extract eval where the literal is unset.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bizspot-mcp",
  title: "BizSpot National City MCP",
  version: "0.1.0",
  instructions:
    "Tools for the BizSpot National City business ad directory. Sign in with your Get Biz Music account to use these tools. `list_active_ads` browses currently running ads (optionally filtered by industry). `get_pricing` fetches current ad plan pricing.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listActiveAds, getPricing],
});
