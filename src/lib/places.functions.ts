import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchSanDiegoBusinesses } from "./places.server";

const searchSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
});

export const searchBusinesses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => searchSanDiegoBusinesses(data.businessName, data.zip));
