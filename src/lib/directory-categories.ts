// Client-safe shared config for the BizMusic Knowledge Graph (AEO/GEO directory).
//
// This file is the single registry for every Knowledge Graph category. Adding a
// new category = adding one entry to DIRECTORY_CATEGORIES (plus its visual
// config in directory-category-ui.ts). No new route files are ever needed:
// /$category and /$category/$slug are served by shared master templates.

export const DIRECTORY_CATEGORY_SLUGS = ["food", "beauty"] as const;

export type DirectoryCategory = (typeof DIRECTORY_CATEGORY_SLUGS)[number];

export type DirectoryCategoryConfig = {
  slug: DirectoryCategory;
  /** Short display title, e.g. "Food & Dining". */
  title: string;
  /** Lowercase phrase used inside sentences, e.g. "food & dining". */
  phrase: string;
  /** Singular noun for a business in this category. */
  noun: string;
  /** Ad industry values that belong to this category. */
  industries: string[];
  /** Hero banner headline (city/scope line). */
  heroTitle: string;
  heroAlt: string;
  seoTitle: string;
  seoDescription: string;
  sliderTitle: string;
  emptyHeadline: string;
  emptyBody: string;
  srHeading: string;
};

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

export const DIRECTORY_CATEGORIES: Record<DirectoryCategory, DirectoryCategoryConfig> = {
  food: {
    slug: "food",
    title: "Food & Dining",
    phrase: "food & dining",
    noun: "restaurant",
    industries: FOOD_INDUSTRIES,
    heroTitle: "Food & Dining In San Diego County",
    heroAlt:
      "Get your restaurant listed, seen and recommended on AI search and answer engines — Get Biz Music AI Food Directory, $49.95/year.",
    seoTitle: "Food & Dining Ads — Get Biz Music",
    seoDescription:
      "Discover local restaurants, food trucks, cafés, bakeries, caterers and markets advertising with Get Biz Music — with music streaming while you browse.",
    sliderTitle: "Featured Food & Dining Business of the Moment",
    emptyHeadline: "No food ads running yet",
    emptyBody: "Be the first restaurant, food truck, café or market featured in the rotation.",
    srHeading: "Food & Dining business ads on Get Biz Music",
  },
  beauty: {
    slug: "beauty",
    title: "Beauty & Grooming",
    phrase: "beauty & grooming",
    noun: "salon",
    industries: BEAUTY_INDUSTRIES,
    heroTitle: "Beauty, Nails & Barbers In San Diego County",
    heroAlt:
      "Get your salon, nail spa or barber shop listed, seen and recommended on AI search — Get Biz Music Beauty Directory, $49.95/year.",
    seoTitle: "Beauty Salon, Nail Spa & Barber Shop Ads — Get Biz Music",
    seoDescription:
      "Discover local beauty salons, nail spas, barber shops, day spas and lash studios advertising with Get Biz Music — with music streaming while you browse.",
    sliderTitle: "Featured Beauty & Grooming Business of the Moment",
    emptyHeadline: "No beauty ads running yet",
    emptyBody: "Be the first salon, barbershop, nail spa or lash studio featured in the rotation.",
    srHeading: "Beauty salon, nail spa and barber shop ads on Get Biz Music",
  },
};

/** True when a URL segment is a registered Knowledge Graph category. */
export function isDirectoryCategory(value?: string | null): value is DirectoryCategory {
  return (DIRECTORY_CATEGORY_SLUGS as readonly string[]).includes((value ?? "").toLowerCase());
}

export const DIRECTORY_LABELS: Record<DirectoryCategory, { title: string; noun: string; basePath: string }> =
  Object.fromEntries(
    DIRECTORY_CATEGORY_SLUGS.map((slug) => [
      slug,
      {
        title: DIRECTORY_CATEGORIES[slug].title,
        noun: DIRECTORY_CATEGORIES[slug].noun,
        basePath: `/${slug}`,
      },
    ]),
  ) as Record<DirectoryCategory, { title: string; noun: string; basePath: string }>;

/** Map an ad industry value to a directory category, or null when it has none. */
export function categoryForIndustry(industry?: string | null): DirectoryCategory | null {
  const value = (industry ?? "").toLowerCase();
  for (const slug of DIRECTORY_CATEGORY_SLUGS) {
    if (DIRECTORY_CATEGORIES[slug].industries.includes(value)) return slug;
  }
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
