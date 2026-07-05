import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_pricing",
  title: "Get ad pricing",
  description:
    "Return the current BizSpot National City ad plans and their annual pricing in USD.",
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
                name: "Static image ad",
                duration_seconds: 5,
                annual_price_usd: 12,
                intro_offer: true,
              },
              {
                id: "slider_10",
                name: "Slider ad",
                duration_seconds: 10,
                annual_price_usd: 24,
                intro_offer: false,
              },
            ],
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
