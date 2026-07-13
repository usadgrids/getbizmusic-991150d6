import { defineTool } from "@lovable.dev/mcp-js";
import { AD_PLANS } from "@/lib/biz-utils";
import { DESIGN_PRICE_CENTS } from "@/lib/design.functions";

export default defineTool({
  name: "get_pricing",
  title: "Get ad pricing",
  description:
    "Return the current Get Biz Music ad plans and their annual pricing in USD.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            currency: "USD",
            plans: [
              {
                id: "image_5",
                name: AD_PLANS.image_5.label,
                duration_seconds: AD_PLANS.image_5.seconds,
                annual_price_usd: AD_PLANS.image_5.price,
              },
              {
                id: "slider_10",
                name: AD_PLANS.slider_10.label,
                duration_seconds: AD_PLANS.slider_10.seconds,
                annual_price_usd: AD_PLANS.slider_10.price,
              },
            ],
            addons: [
              {
                id: "pro_ad_design",
                name: "Get Biz Music Pro Ad Design",
                one_time_price_usd: DESIGN_PRICE_CENTS / 100,
              },
            ],
            free_offer: {
              eligible_industries: ["church", "religious_services", "ministry"],
              plan_id: "slider_10",
              price_usd: 0,
              notes: "Free 12-second slider spot for religious organizations.",
            },
            notes:
              "Ads run for one year from purchase. All sales are final; no refunds (CA Civil Code § 1723 disclosed at checkout).",
          },
          null,
          2,
        ),
      },
    ],
  }),
});
