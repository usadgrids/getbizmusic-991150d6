// SINGLE SOURCE OF TRUTH for the universal Business Category taxonomy.
//
// Used by:
//  - the Find & Claim intake form (/ homepage) -> stores the LABEL in
//    business_claims.business_category
//  - the Activation Code flow + admin ad forms -> store the stable snake_case
//    VALUE in ads.industry / activation_codes.industry
//
// Any future change to the category list happens HERE only.

export type CategoryOption = { value: string; label: string };

export type UniversalCategoryGroup = {
  label: string;
  options: CategoryOption[];
};

/** The universal list shared by every intake form. */
export const UNIVERSAL_CATEGORY_GROUPS: UniversalCategoryGroup[] = [
  {
    label: "Food & Dining",
    options: [
      { value: "restaurants", label: "Restaurants" },
      { value: "bakeries_desserts", label: "Bakeries & Dessert Shops" },
      { value: "coffee_cafes", label: "Coffee Shops & Cafes" },
      { value: "bars_nightlife", label: "Bars & Nightlife" },
      { value: "food_trucks_catering", label: "Food Trucks & Catering" },
    ],
  },
  {
    label: "Beauty & Personal Care",
    options: [
      { value: "salons_barbershops", label: "Salons & Barbershops" },
      { value: "nail_salons", label: "Nail Salons" },
      { value: "spas_massage", label: "Spas & Massage Services" },
      { value: "skincare_esthetics", label: "Skincare & Esthetician Services" },
      { value: "tattoo_piercing", label: "Tattoo & Piercing Studios" },
    ],
  },
  {
    label: "Automotive",
    options: [
      { value: "auto_repair_mechanics", label: "Auto Repair & Mechanics" },
      { value: "auto_detailing_car_wash", label: "Auto Detailing & Car Wash" },
      { value: "tire_shops", label: "Tire Shops" },
      { value: "auto_body_collision", label: "Auto Body & Collision" },
    ],
  },
  {
    label: "Health & Wellness",
    options: [
      { value: "fitness_gyms", label: "Fitness & Gyms" },
      { value: "yoga_martial_arts", label: "Yoga & Martial Arts Studios" },
      { value: "medical_dental", label: "Medical & Dental Services" },
      { value: "chiro_physical_therapy", label: "Chiropractic & Physical Therapy" },
      { value: "mental_health_counseling", label: "Mental Health & Counseling" },
    ],
  },
  {
    label: "Insurance & Financial",
    options: [
      { value: "life_insurance", label: "Life Insurance Agents" },
      { value: "auto_insurance", label: "Auto Insurance Agents" },
      { value: "health_insurance", label: "Health Insurance Agents" },
      { value: "financial_advisors", label: "Financial Advisors & Planners" },
      { value: "accounting_tax", label: "Accountants & Tax Services" },
    ],
  },
  {
    label: "Real Estate & Property",
    options: [
      { value: "real_estate", label: "Real Estate Agents & Brokers" },
      { value: "property_management", label: "Property Management" },
      { value: "mortgage_lending", label: "Mortgage & Lending" },
    ],
  },
  {
    label: "Legal & Professional Services",
    options: [
      { value: "legal_services", label: "Legal Services" },
      { value: "marketing_creative", label: "Marketing & Creative Services" },
      { value: "technology_it", label: "Technology & IT Services" },
      { value: "consulting_services", label: "Consulting Services" },
    ],
  },
  {
    label: "Home Services",
    options: [
      { value: "home_trades", label: "Plumbing, Electrical & HVAC" },
      { value: "cleaning_services", label: "Cleaning Services" },
      { value: "landscaping_lawn", label: "Landscaping & Lawn Care" },
      { value: "contractors_construction", label: "Contractors & Construction" },
      { value: "pest_control", label: "Pest Control" },
    ],
  },
  {
    label: "Retail",
    options: [
      { value: "clothing_apparel", label: "Clothing & Apparel" },
      { value: "jewelry_stores", label: "Jewelry Stores" },
      { value: "gift_shops", label: "Specialty & Gift Shops" },
      { value: "grocery_convenience", label: "Grocery & Convenience Stores" },
      { value: "furniture_home_goods", label: "Furniture & Home Goods" },
      { value: "electronics_stores", label: "Electronics Stores" },
      { value: "water_refilling_stations", label: "Water Refilling Stations" },
    ],
  },
  {
    label: "Pets",
    options: [
      { value: "pet_grooming_boarding", label: "Pet Grooming & Boarding" },
      { value: "veterinary", label: "Veterinary Services" },
    ],
  },
  {
    label: "Events & Creative",
    options: [
      { value: "photo_video", label: "Photography & Videography" },
      { value: "event_planning", label: "Event Planning & Services" },
      { value: "entertainment_dj", label: "Entertainment & DJ Services" },
    ],
  },
  {
    label: "Education & Nonprofit",
    options: [
      { value: "tutoring_education", label: "Tutoring & Education Services" },
      { value: "nonprofit", label: "Nonprofit Organizations" },
    ],
  },
  {
    label: "Religious & Community Organizations",
    options: [
      { value: "churches", label: "Churches" },
      { value: "ministries", label: "Ministries" },
      { value: "para_church_orgs", label: "Para-Church Organizations" },
      { value: "religious_services_org", label: "Religious Services" },
      { value: "temples_synagogues_mosques", label: "Temples, Synagogues & Mosques" },
      { value: "religious_schools", label: "Religious Schools" },
      { value: "faith_based_nonprofits", label: "Faith-Based Nonprofits" },
    ],
  },
  {
    label: "Agriculture & Manufacturing",
    options: [
      { value: "farms_ranches", label: "Farms & Ranches" },
      { value: "nurseries_garden_centers", label: "Nurseries & Garden Centers" },
      { value: "agricultural_services", label: "Agricultural Services" },
      { value: "manufacturers", label: "Manufacturers" },
      { value: "wholesale_distributors", label: "Wholesale Distributors" },
      { value: "import_export", label: "Import/Export" },
    ],
  },
  {
    label: "Transportation, Storage & Logistics",
    options: [
      { value: "trucking_freight", label: "Trucking & Freight" },
      { value: "moving_services", label: "Moving Services" },
      { value: "courier_delivery", label: "Courier & Delivery" },
      { value: "self_storage", label: "Self-Storage Facilities" },
      { value: "warehousing", label: "Warehousing" },
    ],
  },
  {
    label: "Care & Community Services",
    options: [
      { value: "daycare_preschools", label: "Daycare & Preschools" },
      { value: "senior_care_assisted_living", label: "Senior Care & Assisted Living" },
      { value: "in_home_care", label: "In-Home Care Services" },
      { value: "funeral_memorial", label: "Funeral & Memorial Services" },
    ],
  },
  {
    label: "Other Local Services",
    options: [
      { value: "locksmiths", label: "Locksmiths" },
      { value: "appliance_repair", label: "Appliance Repair" },
      { value: "device_repair", label: "Computer & Device Repair" },
      { value: "print_signage", label: "Print & Signage" },
      { value: "security_services_local", label: "Security Services" },
      { value: "solar_renewable", label: "Solar & Renewable Energy" },
      { value: "travel_agencies", label: "Travel Agencies" },
      { value: "rideshare_charter", label: "Rideshare & Charter Services" },
      { value: "sporting_goods_recreation", label: "Sporting Goods & Recreation" },
      { value: "veteran_services", label: "Veteran Services" },
      { value: "government_contractors", label: "Government Contractors" },
    ],
  },
  {

    label: "Business Type",
    options: [
      { value: "home_based_business", label: "Home-Based Business" },
      { value: "mobile_service_business", label: "Mobile/Service-Area Business" },
      { value: "other", label: "Other" },
    ],
  },
];

/**
 * Faith / community group. NOT part of the Find & Claim list, but required by
 * the ad + activation flows because free ($0, 12s) ministry pricing keys off
 * these exact values. Kept in the same file so the taxonomy stays in one place.
 */
export const FAITH_COMMUNITY_GROUP: UniversalCategoryGroup = {
  label: "Faith & Community (FREE spots)",
  options: [
    { value: "church", label: "Church" },
    { value: "religious_services", label: "Religious Services" },
    { value: "ministry", label: "Ministry" },
    { value: "community_event", label: "FREE Community Event" },
  ],
};

/** Category groups used by ad intake / activation-code / admin ad forms. */
export const AD_CATEGORY_GROUPS: UniversalCategoryGroup[] = [
  ...UNIVERSAL_CATEGORY_GROUPS,
  FAITH_COMMUNITY_GROUP,
];

export const AD_CATEGORY_OPTIONS: CategoryOption[] = AD_CATEGORY_GROUPS.flatMap((g) => g.options);

export const UNIVERSAL_CATEGORY_OPTIONS: CategoryOption[] = UNIVERSAL_CATEGORY_GROUPS.flatMap(
  (g) => g.options,
);

/** Label-only shape kept for the Find & Claim form (stores labels). */
export type BusinessCategoryGroup = { label: string; options: string[] };

export const BUSINESS_CATEGORY_GROUPS: BusinessCategoryGroup[] = UNIVERSAL_CATEGORY_GROUPS.map(
  (g) => ({ label: g.label, options: g.options.map((o) => o.label) }),
);

export const BUSINESS_CATEGORIES: string[] = UNIVERSAL_CATEGORY_OPTIONS.map((o) => o.label);

export const DEFAULT_BUSINESS_CATEGORY = "Restaurants";

/** Legacy ad-industry value -> universal value. */
export const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  accounting_tax: "accounting_tax",
  agriculture: "other",
  auto: "auto_repair_mechanics",
  auto_body: "auto_body_collision",
  auto_insurance: "auto_insurance",
  auto_repair: "auto_repair_mechanics",
  bakery: "bakeries_desserts",
  bar_nightlife: "bars_nightlife",
  barbershop: "salons_barbershops",
  boutique_apparel: "clothing_apparel",
  business_consulting: "consulting_services",
  business_opportunities: "other",
  cafe_coffee: "coffee_cafes",
  auto_dealer: "other",
  car_wash: "auto_detailing_car_wash",
  catering: "food_trucks_catering",
  childcare_daycare: "tutoring_education",
  chiropractic: "chiro_physical_therapy",
  cleaning: "cleaning_services",
  community_org: "nonprofit",
  convenience_store: "grocery_convenience",
  dance_school: "tutoring_education",
  delivery_courier: "other",
  dental: "medical_dental",
  dj_entertainment: "entertainment_dj",
  dog_training: "pet_grooming_boarding",
  electrical: "home_trades",
  esthetician: "skincare_esthetics",
  event_planner: "event_planning",
  farmers_market: "grocery_convenience",
  financial_advisor: "financial_advisors",
  fitness_gym: "fitness_gyms",
  flooring: "contractors_construction",
  florist: "gift_shops",
  food_truck: "food_trucks_catering",
  franchise_opportunity: "other",
  funeral_services: "other",
  gift_shop: "gift_shops",
  grocery: "grocery_convenience",
  salon_hair: "salons_barbershops",
  handyman: "contractors_construction",
  health_insurance: "health_insurance",
  healthcare_general: "medical_dental",
  healthcare: "medical_dental",
  services: "home_trades",
  home_services_general: "home_trades",
  hotel_lodging: "other",
  hvac: "home_trades",
  insurance_general: "life_insurance",
  jewelry: "jewelry_stores",
  landscaping_lawn: "landscaping_lawn",
  lash_brow: "skincare_esthetics",
  legal: "legal_services",
  life_insurance: "life_insurance",
  liquor_store: "grocery_convenience",
  locksmith: "home_trades",
  marketing_agency: "marketing_creative",
  martial_arts: "yoga_martial_arts",
  medical_spa: "spas_massage",
  mental_health_counseling: "mental_health_counseling",
  mortgage_lending: "mortgage_lending",
  motorcycle_powersports: "other",
  moving_storage: "other",
  music_lessons: "tutoring_education",
  nail_salon: "nail_salons",
  nonprofit: "nonprofit",
  notary: "legal_services",
  nutrition: "grocery_convenience",
  optometry: "medical_dental",
  other: "other",
  painting: "contractors_construction",
  party_rentals: "event_planning",
  personal_trainer: "fitness_gyms",
  pest_control: "pest_control",
  pet_boarding: "pet_grooming_boarding",
  pet_grooming: "pet_grooming_boarding",
  pharmacy: "medical_dental",
  photographer: "photo_video",
  physical_therapy: "chiro_physical_therapy",
  plumbing: "home_trades",
  pool_spa: "home_trades",
  printing_signs: "marketing_creative",
  private_school: "tutoring_education",
  property_management: "property_management",
  realestate: "real_estate",
  real_estate_agent: "real_estate",
  real_estate_broker: "real_estate",
  restaurant: "restaurants",
  retail: "gift_shops",
  roofing: "contractors_construction",
  rv_boat: "other",
  salon: "salons_barbershops",
  security_services: "other",
  solar: "contractors_construction",
  spa_massage: "spas_massage",
  staffing_recruiting: "consulting_services",
  tattoo_piercing: "tattoo_piercing",
  thrift_secondhand: "clothing_apparel",
  tires_wheels: "tire_shops",
  towing: "auto_repair_mechanics",
  transportation_rideshare: "other",
  tutoring: "tutoring_education",
  urgent_care: "medical_dental",
  veterinary: "veterinary",
  videographer: "photo_video",
  web_design_it: "technology_it",
  wedding_services: "event_planning",
  yoga_pilates: "yoga_martial_arts",
};

/** Normalize any (possibly legacy) industry value to a universal value. */
export function toUniversalIndustry(value?: string | null): string {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "other";
  if (AD_CATEGORY_OPTIONS.some((o) => o.value === v)) return v;
  if (LEGACY_INDUSTRY_MAP[v]) return LEGACY_INDUSTRY_MAP[v];
  const byLabel = AD_CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === v);
  return byLabel?.value ?? "other";
}

export function industryLabel(value?: string | null): string {
  const v = toUniversalIndustry(value);
  return AD_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? "Other";
}

/**
 * Map any category value (legacy claim-form label, directory slug, or ad
 * industry) onto a universal display LABEL. Used by claim / directory code.
 */
export function toUniversalCategory(value?: string | null): string {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "Other";
  const exact = BUSINESS_CATEGORIES.find((c) => c.toLowerCase() === v);
  if (exact) return exact;
  const legacyLabels: Record<string, string> = {
    "food places": "Restaurants",
    bakeries: "Bakeries & Dessert Shops",
    "dessert shops": "Bakeries & Dessert Shops",
    "coffee shops": "Coffee Shops & Cafes",
    cafes: "Coffee Shops & Cafes",
    "food trucks": "Food Trucks & Catering",
    "catering services": "Food Trucks & Catering",
    delis: "Restaurants",
    "juice & smoothie bars": "Coffee Shops & Cafes",
    "pizza shops": "Restaurants",
    "bars & pubs": "Bars & Nightlife",
    "ice cream shops": "Bakeries & Dessert Shops",
    salons: "Salons & Barbershops",
    "barber shops": "Salons & Barbershops",
    "massage services": "Spas & Massage Services",
    spas: "Spas & Massage Services",
    "hair extensions & braiding": "Salons & Barbershops",
    "waxing & threading": "Skincare & Esthetician Services",
    "makeup artists": "Skincare & Esthetician Services",
    food: "Restaurants",
    beauty: "Salons & Barbershops",
  };
  if (legacyLabels[v]) return legacyLabels[v];
  return industryLabel(v);
}
