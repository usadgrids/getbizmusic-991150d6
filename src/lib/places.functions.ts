import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { searchSanDiegoBusinesses } from "./places.server";
import { checkRateLimit } from "./rate-limit.server";

const searchSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  // Optional: the redesigned homepage searches by name only and reads the ZIP
  // back from the selected place's address components.
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a 5-digit ZIP code")
    .optional(),
  category: z.string().trim().max(80).optional(),
});

export const searchBusinesses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (!checkRateLimit(`search:${ip}`, 10, 60_000)) {
      return {
        served: true as const,
        message: "Too many searches. Please wait a minute and try again.",
        results: [],
      };
    }
    return searchSanDiegoBusinesses(data.businessName, data.zip, data.category);
  });
