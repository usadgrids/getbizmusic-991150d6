/**
 * Fuzzy business-name matching used to validate the result of a
 * location-restricted Google Places search.
 *
 * Why: `locationRestriction` forces Google to return *something* inside the
 * rectangle, so a business that isn't in San Diego County can come back as a
 * plausible in-county substitute (searching "Katz's Deli" returned "D Z Akin's").
 *
 * Method (two signals, take the max):
 *  1. Dice coefficient over character bigrams of the normalized strings.
 *  2. Token containment — share of significant tokens of the shorter name that
 *     appear in the other name. Handles "Great Clips" vs "Great Clips #2481".
 *
 * Threshold: 0.55. Above → accept. Below → flag for manual review.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "of", "inc", "llc", "co", "corp", "company", "ltd",
  "restaurant", "shop", "store", "services", "service",
]);

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function bigrams(s: string): string[] {
  const t = s.replace(/\s+/g, "");
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

export function diceCoefficient(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return a === b ? 1 : 0;
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of B) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      hits++;
      counts.set(g, c - 1);
    }
  }
  return (2 * hits) / (A.length + B.length);
}

function tokens(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function tokenContainment(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.length || !B.length) return 0;
  const [short, long] = A.length <= B.length ? [A, B] : [B, A];
  const set = new Set(long);
  const hits = short.filter((t) => set.has(t)).length;
  return hits / short.length;
}

export const NAME_MATCH_THRESHOLD = 0.55;

export type NameMatch = {
  score: number;
  dice: number;
  containment: number;
  matched: boolean;
  searched: string;
  returned: string;
};

export function compareBusinessNames(searched: string, returned: string): NameMatch {
  const a = normalizeName(searched);
  const b = normalizeName(returned);
  const dice = diceCoefficient(a, b);
  const containment = tokenContainment(a, b);
  const score = Math.max(dice, containment);
  return {
    score: Number(score.toFixed(3)),
    dice: Number(dice.toFixed(3)),
    containment: Number(containment.toFixed(3)),
    matched: a === b || score >= NAME_MATCH_THRESHOLD,
    searched,
    returned,
  };
}
