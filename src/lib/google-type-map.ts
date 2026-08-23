// Maps Google Places "types" onto our universal Business Category LABELS
// (see src/lib/business-categories.ts). Used to pre-select the closest
// category after a visitor picks their business from Google results.
import { DEFAULT_BUSINESS_CATEGORY } from "@/lib/business-categories";

const TYPE_TO_CATEGORY: Record<string, string> = {
  // Food & Dining
  restaurant: "Restaurants",
  meal_takeaway: "Restaurants",
  meal_delivery: "Restaurants",
  pizza_restaurant: "Restaurants",
  fast_food_restaurant: "Restaurants",
  bakery: "Bakeries & Dessert Shops",
  dessert_shop: "Bakeries & Dessert Shops",
  ice_cream_shop: "Bakeries & Dessert Shops",
  cafe: "Coffee Shops & Cafes",
  coffee_shop: "Coffee Shops & Cafes",
  bar: "Bars & Nightlife",
  night_club: "Bars & Nightlife",
  catering_service: "Food Trucks & Catering",
  food_truck: "Food Trucks & Catering",

  // Beauty & Personal Care
  beauty_salon: "Salons & Barbershops",
  hair_care: "Salons & Barbershops",
  hair_salon: "Salons & Barbershops",
  barber_shop: "Salons & Barbershops",
  nail_salon: "Nail Salons",
  spa: "Spas & Massage Services",
  massage: "Spas & Massage Services",
  skin_care_clinic: "Skincare & Esthetician Services",
  tattoo_parlor: "Tattoo & Piercing Studios",

  // Automotive
  car_repair: "Auto Repair & Mechanics",
  auto_parts_store: "Auto Repair & Mechanics",
  car_wash: "Auto Detailing & Car Wash",
  tire_shop: "Tire Shops",
  car_dealer: "Auto Repair & Mechanics",

  // Health & Wellness
  gym: "Fitness & Gyms",
  fitness_center: "Fitness & Gyms",
  yoga_studio: "Yoga & Martial Arts Studios",
  doctor: "Medical & Dental Services",
  dentist: "Medical & Dental Services",
  hospital: "Medical & Dental Services",
  pharmacy: "Medical & Dental Services",
  physiotherapist: "Chiropractic & Physical Therapy",
  chiropractor: "Chiropractic & Physical Therapy",
  psychologist: "Mental Health & Counseling",

  // Financial / Legal / Professional
  insurance_agency: "Life Insurance Agents",
  accounting: "Accountants & Tax Services",
  financial_planner: "Financial Advisors & Planners",
  bank: "Financial Advisors & Planners",
  real_estate_agency: "Real Estate Agents & Brokers",
  lawyer: "Legal Services",
  advertising_agency: "Marketing & Creative Services",
  marketing_agency: "Marketing & Creative Services",
  consultant: "Consulting Services",
  electronics_store: "Electronics Stores",

  // Home Services
  plumber: "Plumbing, Electrical & HVAC",
  electrician: "Plumbing, Electrical & HVAC",
  hvac_contractor: "Plumbing, Electrical & HVAC",
  roofing_contractor: "Contractors & Construction",
  general_contractor: "Contractors & Construction",
  painter: "Contractors & Construction",
  moving_company: "Cleaning Services",
  laundry: "Cleaning Services",
  landscaper: "Landscaping & Lawn Care",
  pest_control_service: "Pest Control",

  // Retail
  clothing_store: "Clothing & Apparel",
  shoe_store: "Clothing & Apparel",
  jewelry_store: "Jewelry Stores",
  gift_shop: "Specialty & Gift Shops",
  florist: "Specialty & Gift Shops",
  grocery_store: "Grocery & Convenience Stores",
  supermarket: "Grocery & Convenience Stores",
  convenience_store: "Grocery & Convenience Stores",
  liquor_store: "Grocery & Convenience Stores",
  furniture_store: "Furniture & Home Goods",
  home_goods_store: "Furniture & Home Goods",

  // Pets
  pet_store: "Pet Grooming & Boarding",
  pet_groomer: "Pet Grooming & Boarding",
  veterinary_care: "Veterinary Services",

  // Events & Creative
  photographer: "Photography & Videography",
  event_venue: "Event Planning & Services",
  wedding_venue: "Event Planning & Services",

  // Education & Nonprofit
  school: "Tutoring & Education Services",
  primary_school: "Tutoring & Education Services",
  secondary_school: "Tutoring & Education Services",
  university: "Tutoring & Education Services",
};

/** Best-guess Business Category label for a Google Places `types` array. */
export function categoryFromGoogleTypes(types?: string[] | null): string {
  for (const t of types ?? []) {
    const hit = TYPE_TO_CATEGORY[t];
    if (hit) return hit;
  }
  return DEFAULT_BUSINESS_CATEGORY;
}

/** Human-friendly badge label for the first meaningful Google type. */
export function googleTypeBadge(types?: string[] | null): string | null {
  const skip = new Set(["point_of_interest", "establishment", "food", "store", "health"]);
  const t = (types ?? []).find((x) => !skip.has(x));
  if (!t) return null;
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
