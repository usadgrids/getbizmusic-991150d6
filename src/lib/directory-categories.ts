// Client-safe shared config for the AEO/GEO business directory.

export type DirectoryCategory = "food" | "beauty";

export const FOOD_INDUSTRIES = [
  "restaurant",
  "food_truck",
  "cafe_coffee",
  "bakery",
  "catering",
  "bar_nightlife",
  "grocery",
  "farmers_market",
  "convenience_store",
  "liquor_store",
  "nutrition",
];

export const BEAUTY_INDUSTRIES = [
  "salon",
  "salon_hair",
  "nail_salon",
  "barbershop",
  "spa_massage",
  "medical_spa",
];

export const DIRECTORY_LABELS: Record<DirectoryCategory, { title: string; noun: string; basePath: string }> = {
  food: { title: "Food & Dining", noun: "restaurant", basePath: "/food" },
  beauty: { title: "Beauty & Grooming", noun: "salon", basePath: "/beauty" },
};

/** Map an ad industry value to a directory category, or null when it has none. */
export function categoryForIndustry(industry?: string | null): DirectoryCategory | null {
  const value = (industry ?? "").toLowerCase();
  if (FOOD_INDUSTRIES.includes(value)) return "food";
  if (BEAUTY_INDUSTRIES.includes(value)) return "beauty";
  return null;
}

/** schema.org @type used in the JSON-LD block for each listing. */
export function schemaTypeFor(category: DirectoryCategory, industry?: string | null): string {
  if (category === "food") return "Restaurant";
  const v = (industry ?? "").toLowerCase();
  if (v === "barbershop") return "HairSalon";
  if (v === "nail_salon") return "NailSalon";
  if (v === "spa_massage" || v === "medical_spa") return "DaySpa";
  return "HairSalon";
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type DirectoryPlace = {
  id: string;
  slug: string;
  category: string;
  name: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  cuisines: string[];
  price_range: string | null;
  hours: Record<string, string>;
  attributes: Record<string, JsonValue>;
  description: string | null;
  summary: string | null;
  rating: number | null;
  review_count: number | null;
  image_url: string | null;
  source_urls: string[];
  last_crawled_at: string | null;
  status: string;
  ad_id: string;
};

export type DirectoryFaq = { question: string; answer: string };

export const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
