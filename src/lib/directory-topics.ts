// Client-safe topic registry for the BizMusic Knowledge Graph.
//
// Topics are the unbranded, question-shaped entry points (/beauty/gel-manicure,
// /food/tacos). They are DERIVED from the services/cuisines already stored on
// each published listing — never hand-authored — so a new advertiser
// automatically creates or joins the topic pages it belongs to.

import type { DirectoryCategory, DirectoryPlace } from "@/lib/directory-categories";

/** Values that are too generic or not a real service/dish to build a page from. */
const STOP_TOPICS = new Set([
  "salon",
  "beauty",
  "beauty salon",
  "hair",
  "hair salon",
  "nails",
  "nail salon",
  "barber",
  "barbershop",
  "spa",
  "food",
  "restaurant",
  "cafe",
  "coffee shop",
  "dining",
  "takeout",
  "delivery",
  "other",
  "misc",
  "general",
  "services",
  "service",
]);

/** Collapse synonyms so "gel nails" and "gel manicure" share one page. */
const SYNONYMS: Record<string, string> = {
  "gel nails": "gel manicure",
  "gel polish": "gel manicure",
  "gel mani": "gel manicure",
  "dip nails": "dip powder nails",
  "dip powder": "dip powder nails",
  "acrylics": "acrylic nails",
  "acrylic set": "acrylic nails",
  "mani pedi": "manicure and pedicure",
  "mens haircut": "haircut",
  "men's haircut": "haircut",
  "womens haircut": "haircut",
  "women's haircut": "haircut",
  "hair cut": "haircut",
  "haircuts": "haircut",
  "fade": "fade haircut",
  "fades": "fade haircut",
  "skin fade": "fade haircut",
  "taper fade": "fade haircut",
  "kids cut": "kids haircut",
  "kids cuts": "kids haircut",
  "children's haircut": "kids haircut",
  "highlights": "hair highlights",
  "balayage highlights": "balayage",
  "color": "hair color",
  "hair coloring": "hair color",
  "lashes": "lash extensions",
  "eyelash extensions": "lash extensions",
  "brows": "eyebrow shaping",
  "eyebrow threading": "eyebrow shaping",
  "waxing services": "waxing",
  "facial": "facials",
  "massage therapy": "massage",
  "tacos": "tacos",
  "birria": "birria tacos",
  "bbq": "barbecue",
  "barbeque": "barbecue",
  "coffee": "coffee",
  "espresso": "coffee",
  "pizza pie": "pizza",
  "filipino food": "filipino food",
  "mexican": "mexican food",
  "italian": "italian food",
  "chinese": "chinese food",
  "thai": "thai food",
  "japanese": "japanese food",
  "seafood dishes": "seafood",
  "vegan options": "vegan food",
  "vegetarian options": "vegetarian food",
  "gluten free": "gluten-free food",
  "halal": "halal food",
  "catering services": "catering",
  "breakfast menu": "breakfast",
  "brunch menu": "brunch",
};

export function slugifyTopic(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type DirectoryTopic = {
  slug: string;
  label: string;
  category: DirectoryCategory;
  places: DirectoryPlace[];
};

/** Normalize one raw service/cuisine value into a topic label, or null to skip. */
export function normalizeTopicLabel(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]+$/, "");
  if (cleaned.length < 3 || cleaned.length > 40) return null;
  const mapped = SYNONYMS[cleaned] ?? cleaned;
  if (STOP_TOPICS.has(mapped)) return null;
  if (!/[a-z]/.test(mapped)) return null;
  return mapped;
}

/** Human-facing display title, e.g. "gel manicure" -> "Gel Manicure". */
export function topicTitle(label: string): string {
  return label.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** The unbranded question the page is written to answer. */
export function topicQuestion(category: DirectoryCategory, label: string): string {
  return category === "food"
    ? `Where can I get ${label}?`
    : `Where can I get ${label}?`;
}

/** Build the full topic list for a category from its published listings. */
export function buildTopics(
  category: DirectoryCategory,
  places: DirectoryPlace[],
): DirectoryTopic[] {
  const map = new Map<string, DirectoryTopic>();
  for (const place of places) {
    const raw = [
      ...(place.cuisines ?? []),
      ...extractAttributeTopics(place.attributes ?? {}),
    ];
    const seen = new Set<string>();
    for (const value of raw) {
      const label = normalizeTopicLabel(String(value));
      if (!label) continue;
      const slug = slugifyTopic(label);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const existing = map.get(slug);
      if (existing) existing.places.push(place);
      else map.set(slug, { slug, label, category, places: [place] });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.places.length - a.places.length || a.label.localeCompare(b.label),
  );
}

/** Pull service-ish values out of the free-form attributes blob. */
function extractAttributeTopics(attributes: Record<string, unknown>): string[] {
  const keys = ["specialties", "menu_highlights", "services", "dietary", "treatments"];
  const out: string[] = [];
  for (const key of keys) {
    const value = attributes[key];
    if (Array.isArray(value)) out.push(...value.map(String));
    else if (typeof value === "string") out.push(...value.split(/,\s*/));
  }
  return out;
}
