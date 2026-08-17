// Ad / activation-code category list.
// NOTE: this is a re-export of the single universal taxonomy defined in
// src/lib/business-categories.ts — do not maintain a second copy here.
import { AD_CATEGORY_OPTIONS, AD_CATEGORY_GROUPS } from "@/lib/business-categories";

export { AD_CATEGORY_GROUPS };
export const INDUSTRIES: { value: string; label: string }[] = AD_CATEGORY_OPTIONS;


export const RELIGIOUS_INDUSTRY_VALUES = [
  "church",
  "religious_services",
  "ministry",
  "community_event",
] as const;

export function isReligiousIndustry(value: string | null | undefined): boolean {
  if (!value) return false;
  return (RELIGIOUS_INDUSTRY_VALUES as readonly string[]).includes(value);
}

export const AD_PLANS = {
  image_5: { label: "Standard Image Ad", price: 24, seconds: 7 },
  slider_10: { label: "Featured Slider Ad", price: 48, seconds: 10 },
} as const;

export type AdPlan = keyof typeof AD_PLANS;
