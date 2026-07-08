export const INDUSTRIES = [
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "legal", label: "Lawyer / Legal" },
  { value: "salon", label: "Salon / Beauty" },
  { value: "auto", label: "Auto / Repair" },
  { value: "healthcare", label: "Healthcare / Dental" },
  { value: "realestate", label: "Real Estate" },
  { value: "retail", label: "Retail / Shopping" },
  { value: "services", label: "Home Services" },
  { value: "other", label: "Other" },
] as const;

export const AD_PLANS = {
  image_5: { label: "Standard Image Ad", price: 24, seconds: 7 },
  slider_10: { label: "Featured Slider Ad", price: 48, seconds: 10 },
} as const;

export type AdPlan = keyof typeof AD_PLANS;
