// Self-reported business category options shown in the claim-your-listing
// search form. Configurable per Knowledge Graph category page — add an entry
// here when a new category page is built.

import type { DirectoryCategory } from "@/lib/directory-categories";

export const CLAIM_CATEGORY_OPTIONS: Record<DirectoryCategory, string[]> = {
  food: [
    "Restaurants",
    "Food Places",
    "Bakeries",
    "Coffee Shops",
    "Cafes",
    "Food Trucks",
    "Catering Services",
    "Delis",
    "Dessert Shops",
    "Juice & Smoothie Bars",
    "Pizza Shops",
    "Bars & Pubs",
    "Ice Cream Shops",
    "Other",
  ],
  beauty: [
    "Salons",
    "Barber Shops",
    "Nail Salons",
    "Massage Services",
    "Spas",
    "Hair Extensions & Braiding",
    "Waxing & Threading",
    "Tattoo & Piercing Studios",
    "Makeup Artists",
    "Skincare & Esthetician Services",
    "Other",
  ],
};

export function claimCategoryOptions(category: DirectoryCategory): string[] {
  return CLAIM_CATEGORY_OPTIONS[category] ?? ["Other"];
}
