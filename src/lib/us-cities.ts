// Lazy-loaded US cities dataset (~30k rows, ~550KB JSON).
// Loader kept out of main bundle so the searchable dropdown only pays the
// cost when the buyer opens it.

export type UsCity = { name: string; stateCode: string };

type Row = [string, string]; // [city, stateCode]

let cache: Row[] | null = null;
let loading: Promise<Row[]> | null = null;

async function loadRows(): Promise<Row[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = import("@/data/us-cities.json").then((m) => {
    cache = (m.default ?? m) as unknown as Row[];
    return cache!;
  });
  return loading;
}

/**
 * Prefix-first, then substring match on "City, ST".
 * Returns up to `limit` matches; cheap enough for keystroke-level filtering.
 */
export async function searchCities(query: string, limit = 30): Promise<UsCity[]> {
  const rows = await loadRows();
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, limit).map(([name, stateCode]) => ({ name, stateCode }));

  const prefix: UsCity[] = [];
  const contains: UsCity[] = [];
  for (let i = 0; i < rows.length; i++) {
    const [name, stateCode] = rows[i];
    const label = `${name}, ${stateCode}`.toLowerCase();
    if (label.startsWith(q) || name.toLowerCase().startsWith(q)) {
      prefix.push({ name, stateCode });
      if (prefix.length >= limit) return prefix;
    } else if (label.includes(q)) {
      if (prefix.length + contains.length < limit) contains.push({ name, stateCode });
    }
  }
  return [...prefix, ...contains].slice(0, limit);
}

/** True if (name, stateCode) is a real US city+state pair. */
export async function isValidUsCity(name: string, stateCode: string): Promise<boolean> {
  const rows = await loadRows();
  const n = name.trim().toLowerCase();
  const s = stateCode.trim().toUpperCase();
  return rows.some(([rn, rs]) => rn.toLowerCase() === n && rs === s);
}

/** Slugify a city+state into a URL slug like "austin-tx". */
export function slugifyCity(name: string, stateCode: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${stateCode.toLowerCase()}`;
}
