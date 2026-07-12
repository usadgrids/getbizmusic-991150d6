export const INDUSTRIES = [
  // Food & Hospitality
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "cafe_coffee", label: "Café / Coffee Shop" },
  { value: "bakery", label: "Bakery" },
  { value: "food_truck", label: "Food Truck" },
  { value: "catering", label: "Catering" },
  { value: "bar_nightlife", label: "Bar / Nightlife" },
  { value: "hotel_lodging", label: "Hotel / Lodging" },

  // Retail & Shopping
  { value: "retail", label: "Retail / Shopping" },
  { value: "convenience_store", label: "Convenience Store" },
  { value: "grocery", label: "Grocery / Market" },
  { value: "liquor_store", label: "Liquor Store" },
  { value: "boutique_apparel", label: "Boutique / Apparel" },
  { value: "jewelry", label: "Jewelry" },
  { value: "florist", label: "Florist" },
  { value: "gift_shop", label: "Gift Shop" },
  { value: "thrift_secondhand", label: "Thrift / Secondhand" },
  { value: "farmers_market", label: "Farmers Market" },

  // Automotive
  { value: "auto", label: "Auto / Repair" },
  { value: "auto_repair", label: "Auto Repair" },
  { value: "auto_dealer", label: "Car Dealer" },
  { value: "auto_body", label: "Auto Body / Collision" },
  { value: "tires_wheels", label: "Tires / Wheels" },
  { value: "car_wash", label: "Car Wash / Detailing" },
  { value: "towing", label: "Towing" },
  { value: "motorcycle_powersports", label: "Motorcycle / Powersports" },
  { value: "rv_boat", label: "RV / Boat" },

  // Home & Trades
  { value: "services", label: "Home Services" },
  { value: "home_services_general", label: "Home Services (General)" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC / Heating & Cooling" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping_lawn", label: "Landscaping / Lawn Care" },
  { value: "pest_control", label: "Pest Control" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "moving_storage", label: "Moving / Storage" },
  { value: "handyman", label: "Handyman" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "pool_spa", label: "Pool / Spa Services" },
  { value: "solar", label: "Solar" },
  { value: "locksmith", label: "Locksmith" },

  // Professional Services
  { value: "legal", label: "Lawyer / Legal" },
  { value: "accounting_tax", label: "Accountant / Tax Services" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "insurance_general", label: "Insurance (General)" },
  { value: "life_insurance", label: "Life Insurance Agent" },
  { value: "health_insurance", label: "Health Insurance Agent" },
  { value: "auto_insurance", label: "Auto Insurance Agent" },
  { value: "mortgage_lending", label: "Mortgage / Lending" },
  { value: "realestate", label: "Real Estate" },
  { value: "real_estate_agent", label: "Real Estate Agent" },
  { value: "real_estate_broker", label: "Real Estate Broker" },
  { value: "property_management", label: "Property Management" },
  { value: "notary", label: "Notary" },
  { value: "marketing_agency", label: "Marketing / Advertising Agency" },
  { value: "web_design_it", label: "Web Design / IT Services" },
  { value: "business_consulting", label: "Business Consulting" },
  { value: "business_opportunities", label: "Business Opportunities" },
  { value: "franchise_opportunity", label: "Franchise Opportunity" },
  { value: "staffing_recruiting", label: "Staffing / Recruiting" },
  { value: "printing_signs", label: "Printing / Signs" },

  // Health & Wellness
  { value: "healthcare", label: "Healthcare / Dental" },
  { value: "healthcare_general", label: "Healthcare (General)" },
  { value: "dental", label: "Dental" },
  { value: "chiropractic", label: "Chiropractic" },
  { value: "optometry", label: "Optometry / Eye Care" },
  { value: "physical_therapy", label: "Physical Therapy" },
  { value: "mental_health_counseling", label: "Mental Health / Counseling" },
  { value: "medical_spa", label: "Medical Spa" },
  { value: "veterinary", label: "Veterinary" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "urgent_care", label: "Urgent Care / Clinic" },
  { value: "fitness_gym", label: "Fitness / Gym" },
  { value: "personal_trainer", label: "Personal Trainer" },
  { value: "yoga_pilates", label: "Yoga / Pilates" },
  { value: "nutrition", label: "Nutrition / Wellness" },

  // Beauty & Personal Care
  { value: "salon", label: "Salon / Beauty" },
  { value: "salon_hair", label: "Hair Salon" },
  { value: "barbershop", label: "Barbershop" },
  { value: "nail_salon", label: "Nail Salon" },
  { value: "spa_massage", label: "Spa / Massage" },
  { value: "tattoo_piercing", label: "Tattoo / Piercing" },
  { value: "lash_brow", label: "Lash / Brow Studio" },
  { value: "esthetician", label: "Esthetician / Skincare" },

  // Family, Pets & Education
  { value: "childcare_daycare", label: "Childcare / Daycare" },
  { value: "tutoring", label: "Tutoring" },
  { value: "music_lessons", label: "Music Lessons" },
  { value: "dance_school", label: "Dance School" },
  { value: "martial_arts", label: "Martial Arts" },
  { value: "private_school", label: "Private School" },
  { value: "pet_grooming", label: "Pet Grooming" },
  { value: "pet_boarding", label: "Pet Boarding / Daycare" },
  { value: "dog_training", label: "Dog Training" },

  // Events & Creative
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "event_planner", label: "Event Planner" },
  { value: "dj_entertainment", label: "DJ / Entertainment" },
  { value: "wedding_services", label: "Wedding Services" },
  { value: "party_rentals", label: "Party Rentals" },

  // Community & Nonprofit (religious triggers Christian playlist)
  { value: "church", label: "Church" },
  { value: "religious_services", label: "Religious Services" },
  { value: "ministry", label: "Ministry" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "community_org", label: "Community Organization" },

  // Other
  { value: "transportation_rideshare", label: "Transportation / Rideshare" },
  { value: "delivery_courier", label: "Delivery / Courier" },
  { value: "security_services", label: "Security Services" },
  { value: "funeral_services", label: "Funeral Services" },
  { value: "agriculture", label: "Agriculture / Farming" },
  { value: "other", label: "Other" },
] as const;

export const RELIGIOUS_INDUSTRY_VALUES = [
  "church",
  "religious_services",
  "ministry",
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
