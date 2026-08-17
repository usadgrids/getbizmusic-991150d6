DO $$
DECLARE m jsonb := '{
 "accounting_tax":"accounting_tax","agriculture":"other","auto":"auto_repair_mechanics","auto_body":"auto_body_collision",
 "auto_insurance":"auto_insurance","auto_repair":"auto_repair_mechanics","bakery":"bakeries_desserts","bar_nightlife":"bars_nightlife",
 "barbershop":"salons_barbershops","boutique_apparel":"clothing_apparel","business_consulting":"consulting_services",
 "business_opportunities":"other","cafe_coffee":"coffee_cafes","auto_dealer":"other","car_wash":"auto_detailing_car_wash",
 "catering":"food_trucks_catering","childcare_daycare":"tutoring_education","chiropractic":"chiro_physical_therapy",
 "cleaning":"cleaning_services","community_org":"nonprofit","convenience_store":"grocery_convenience","dance_school":"tutoring_education",
 "delivery_courier":"other","dental":"medical_dental","dj_entertainment":"entertainment_dj","dog_training":"pet_grooming_boarding",
 "electrical":"home_trades","esthetician":"skincare_esthetics","event_planner":"event_planning","farmers_market":"grocery_convenience",
 "financial_advisor":"financial_advisors","fitness_gym":"fitness_gyms","flooring":"contractors_construction","florist":"gift_shops",
 "food_truck":"food_trucks_catering","franchise_opportunity":"other","funeral_services":"other","gift_shop":"gift_shops",
 "grocery":"grocery_convenience","salon_hair":"salons_barbershops","handyman":"contractors_construction","health_insurance":"health_insurance",
 "healthcare_general":"medical_dental","healthcare":"medical_dental","services":"home_trades","home_services_general":"home_trades",
 "hotel_lodging":"other","hvac":"home_trades","insurance_general":"life_insurance","jewelry":"jewelry_stores",
 "landscaping_lawn":"landscaping_lawn","lash_brow":"skincare_esthetics","legal":"legal_services","life_insurance":"life_insurance",
 "liquor_store":"grocery_convenience","locksmith":"home_trades","marketing_agency":"marketing_creative","martial_arts":"yoga_martial_arts",
 "medical_spa":"spas_massage","mental_health_counseling":"mental_health_counseling","mortgage_lending":"mortgage_lending",
 "motorcycle_powersports":"other","moving_storage":"other","music_lessons":"tutoring_education","nail_salon":"nail_salons",
 "nonprofit":"nonprofit","notary":"legal_services","nutrition":"grocery_convenience","optometry":"medical_dental","other":"other",
 "painting":"contractors_construction","party_rentals":"event_planning","personal_trainer":"fitness_gyms","pest_control":"pest_control",
 "pet_boarding":"pet_grooming_boarding","pet_grooming":"pet_grooming_boarding","pharmacy":"medical_dental","photographer":"photo_video",
 "physical_therapy":"chiro_physical_therapy","plumbing":"home_trades","pool_spa":"home_trades","printing_signs":"marketing_creative",
 "private_school":"tutoring_education","property_management":"property_management","realestate":"real_estate",
 "real_estate_agent":"real_estate","real_estate_broker":"real_estate","restaurant":"restaurants","retail":"gift_shops",
 "roofing":"contractors_construction","rv_boat":"other","salon":"salons_barbershops","security_services":"other",
 "solar":"contractors_construction","spa_massage":"spas_massage","staffing_recruiting":"consulting_services",
 "tattoo_piercing":"tattoo_piercing","thrift_secondhand":"clothing_apparel","tires_wheels":"tire_shops","towing":"auto_repair_mechanics",
 "transportation_rideshare":"other","tutoring":"tutoring_education","urgent_care":"medical_dental","veterinary":"veterinary",
 "videographer":"photo_video","web_design_it":"technology_it","wedding_services":"event_planning","yoga_pilates":"yoga_martial_arts"
}'::jsonb;
BEGIN
  UPDATE public.ads a SET industry = m->>a.industry WHERE m ? a.industry AND m->>a.industry <> a.industry;
  UPDATE public.activation_codes c SET industry = m->>c.industry WHERE m ? c.industry AND m->>c.industry <> c.industry;
  UPDATE public.ad_submissions s SET industry = m->>s.industry WHERE m ? s.industry AND m->>s.industry <> s.industry;
END $$;