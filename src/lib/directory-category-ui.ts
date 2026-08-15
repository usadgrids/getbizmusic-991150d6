// Visual configuration for each BizMusic Knowledge Graph category.
// Kept separate from directory-categories.ts so server-only modules never pull
// in image assets. Add one entry here when you add a category to the registry.

import type { LucideIcon } from "lucide-react";
import { Scissors, UtensilsCrossed } from "lucide-react";
import type { DirectoryCategory } from "@/lib/directory-categories";
import type { PublicAd } from "@/lib/ads.functions";

import foodHero from "@/assets/food-hero.png.asset.json";
import beautyHero from "@/assets/beauty-hero.png.asset.json";
import adAmerican from "@/assets/food-ad-american.jpg";
import adFilipino from "@/assets/food-ad-filipino.jpg";
import adMexican from "@/assets/food-ad-mexican.jpg";
import adItalian from "@/assets/food-ad-italian.jpg";
import adBuffet from "@/assets/food-ad-buffet.jpg";

import thumbFood from "@/assets/category-thumb-food.jpg";
import thumbBeauty from "@/assets/category-thumb-beauty.jpg";
import adCutDye from "@/assets/beauty-ad-cut-dye.jpg";
import adNails from "@/assets/beauty-ad-nails.jpg";
import adBarber from "@/assets/beauty-ad-barber.jpg";
import adSpa from "@/assets/beauty-ad-spa.jpg";
import adLash from "@/assets/beauty-ad-lash.jpg";

type Showcase = { id: string; name: string; tagline: string; industry: string; image: string };

function toShowcaseAds(items: Showcase[]): PublicAd[] {
  return items.map((item) => ({
    id: `showcase-${item.id}`,
    ad_number: null,
    business_name: item.name,
    website_url: null,
    youtube_url: null,
    tagline: item.tagline,
    industry: item.industry,
    ad_type: "slider_10",
    image_url: item.image,
    duration_seconds: 10,
  }));
}

export type DirectoryCategoryUi = {
  /** Full-width promo banner at the top of the hub page. null = no banner image. */
  heroImage: string | null;
  /** Square-ish artwork used for the category card on the home page. */
  thumbnail: string;
  icon: LucideIcon;
  showcaseAds: PublicAd[];
};

export const DIRECTORY_CATEGORY_UI: Record<DirectoryCategory, DirectoryCategoryUi> = {
  food: {
    heroImage: foodHero.url,
    thumbnail: thumbFood,
    icon: UtensilsCrossed,
    showcaseAds: toShowcaseAds([
      { id: "american", name: "Liberty Grill House", tagline: "All-American Burgers, Ribs & Shakes", industry: "restaurant", image: adAmerican },
      { id: "filipino", name: "Kusina Ni Lola", tagline: "Authentic Filipino Comfort Food", industry: "restaurant", image: adFilipino },
      { id: "mexican", name: "Casa Del Sol Taqueria", tagline: "Street Tacos, Fresh Salsa, Real Fire", industry: "restaurant", image: adMexican },
      { id: "italian", name: "Trattoria Bella Vita", tagline: "Handmade Pasta & Wood-Fired Pizza", industry: "restaurant", image: adItalian },
      { id: "buffet", name: "Grand Harvest Buffet", tagline: "All-You-Can-Eat International Favorites", industry: "restaurant", image: adBuffet },
    ]),
  },
  beauty: {
    heroImage: beautyHero.url,
    thumbnail: thumbBeauty,
    icon: Scissors,
    showcaseAds: toShowcaseAds([
      { id: "cut-dye", name: "Lumina Salon", tagline: "Precision Cuts & Luxe Color", industry: "salon_hair", image: adCutDye },
      { id: "nails", name: "Luxe Nail Spa", tagline: "Beauty At Your Fingertips", industry: "nail_salon", image: adNails },
      { id: "barber", name: "Iron & Oak Barbershop", tagline: "Cuts, Shaves & Character", industry: "barbershop", image: adBarber },
      { id: "spa", name: "Restore Day Spa & Massage", tagline: "Rest. Renew. Recenter.", industry: "spa_massage", image: adSpa },
      { id: "lash", name: "Luxe Lash & Brow Bar", tagline: "Lash Extensions & Expert Brows", industry: "salon", image: adLash },
    ]),
  },
};
