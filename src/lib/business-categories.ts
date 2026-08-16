// Universal business category taxonomy used across the county-wide
// (/sdcounty) directory: the Find & Claim widget, the manual-entry fallback
// form, and the directory filter. Stored in business_claims.business_category.

export type BusinessCategoryGroup = {
  label: string;
  options: string[];
};

export const BUSINESS_CATEGORY_GROUPS: BusinessCategoryGroup[] = [
  {
    label: "Food & Dining",
    options: [
      "Restaurants",
      "Bakeries & Dessert Shops",
      "Coffee Shops & Cafes",
      "Bars & Nightlife",
      "Food Trucks & Catering",
    ],
  },
  {
    label: "Beauty & Personal Care",
    options: [
      "Salons & Barbershops",
      "Nail Salons",
      "Spas & Massage Services",
      "Skincare & Esthetician Services",
      "Tattoo & Piercing Studios",
    ],
  },
  {
    label: "Automotive",
    options: [
      "Auto Repair & Mechanics",
      "Auto Detailing & Car Wash",
      "Tire Shops",
      "Auto Body & Collision",
    ],
  },
  {
    label: "Health & Wellness",
    options: [
      "Fitness & Gyms",
      "Yoga & Martial Arts Studios",
      "Medical & Dental Services",
      "Chiropractic & Physical Therapy",
      "Mental Health & Counseling",
    ],
  },
  {
    label: "Insurance & Financial",
    options: [
      "Life Insurance Agents",
      "Auto Insurance Agents",
      "Health Insurance Agents",
      "Financial Advisors & Planners",
      "Accountants & Tax Services",
    ],
  },
  {
    label: "Real Estate & Property",
    options: ["Real Estate Agents & Brokers", "Property Management", "Mortgage & Lending"],
  },
  {
    label: "Legal & Professional Services",
    options: [
      "Legal Services",
      "Marketing & Creative Services",
      "Technology & IT Services",
      "Consulting Services",
    ],
  },
  {
    label: "Home Services",
    options: [
      "Plumbing, Electrical & HVAC",
      "Cleaning Services",
      "Landscaping & Lawn Care",
      "Contractors & Construction",
      "Pest Control",
    ],
  },
  {
    label: "Retail",
    options: ["Clothing & Apparel", "Specialty & Gift Shops", "Grocery & Convenience Stores"],
  },
  {
    label: "Pets",
    options: ["Pet Grooming & Boarding", "Veterinary Services"],
  },
  {
    label: "Events & Creative",
    options: [
      "Photography & Videography",
      "Event Planning & Services",
      "Entertainment & DJ Services",
    ],
  },
  {
    label: "Education & Nonprofit",
    options: ["Tutoring & Education Services", "Nonprofit Organizations"],
  },
  {
    label: "Business Type",
    options: ["Home-Based Business", "Mobile/Service-Area Business", "Other"],
  },
];

export const BUSINESS_CATEGORIES: string[] = BUSINESS_CATEGORY_GROUPS.flatMap((g) => g.options);

export const DEFAULT_BUSINESS_CATEGORY = "Restaurants";

/**
 * Map a legacy /food or /beauty category value (or a raw ad industry) onto the
 * universal taxonomy above. Used when carrying existing listings forward.
 */
export function toUniversalCategory(value?: string | null): string {
  const v = (value ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    // legacy claim-form values
    restaurants: "Restaurants",
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
    "nail salons": "Nail Salons",
    "massage services": "Spas & Massage Services",
    spas: "Spas & Massage Services",
    "hair extensions & braiding": "Salons & Barbershops",
    "waxing & threading": "Skincare & Esthetician Services",
    "tattoo & piercing studios": "Tattoo & Piercing Studios",
    "makeup artists": "Skincare & Esthetician Services",
    "skincare & esthetician services": "Skincare & Esthetician Services",
    // ad industry values
    restaurant: "Restaurants",
    food_truck: "Food Trucks & Catering",
    cafe_coffee: "Coffee Shops & Cafes",
    bakery: "Bakeries & Dessert Shops",
    catering: "Food Trucks & Catering",
    bar_nightlife: "Bars & Nightlife",
    grocery: "Grocery & Convenience Stores",
    farmers_market: "Grocery & Convenience Stores",
    convenience_store: "Grocery & Convenience Stores",
    liquor_store: "Grocery & Convenience Stores",
    nutrition: "Grocery & Convenience Stores",
    salon: "Salons & Barbershops",
    salon_hair: "Salons & Barbershops",
    nail_salon: "Nail Salons",
    barbershop: "Salons & Barbershops",
    spa_massage: "Spas & Massage Services",
    medical_spa: "Spas & Massage Services",
    // directory category slugs
    food: "Restaurants",
    beauty: "Salons & Barbershops",
  };
  if (map[v]) return map[v];
  const exact = BUSINESS_CATEGORIES.find((c) => c.toLowerCase() === v);
  return exact ?? "Other";
}
