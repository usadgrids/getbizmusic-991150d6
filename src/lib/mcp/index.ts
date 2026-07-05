import { defineMcp } from "@lovable.dev/mcp-js";
import listActiveAds from "./tools/list-active-ads";
import getPricing from "./tools/get-pricing";

export default defineMcp({
  name: "bizspot-mcp",
  title: "BizSpot National City MCP",
  version: "0.1.0",
  instructions:
    "Tools for the BizSpot National City business ad directory. Use `list_active_ads` to browse currently running ads (optionally filtered by industry) and `get_pricing` to fetch current ad plan pricing.",
  tools: [listActiveAds, getPricing],
});
