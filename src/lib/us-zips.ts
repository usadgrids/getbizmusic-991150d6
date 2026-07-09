// Lazy-loaded US ZIP dataset. Rows: [zip, city, stateCode].
export type ZipRow = [string, string, string];

let cache: ZipRow[] | null = null;
let loading: Promise<ZipRow[]> | null = null;
let byCityState: Map<string, string[]> | null = null;
let byZip: Map<string, { city: string; stateCode: string }> | null = null;

async function loadRows(): Promise<ZipRow[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = import("@/data/us-zips.json").then((m) => {
    cache = (m.default ?? m) as unknown as ZipRow[];
    byCityState = new Map();
    byZip = new Map();
    for (const [zip, city, st] of cache) {
      const key = `${city.toLowerCase()}|${st.toUpperCase()}`;
      const arr = byCityState.get(key);
      if (arr) arr.push(zip);
      else byCityState.set(key, [zip]);
      byZip.set(zip, { city, stateCode: st });
    }
    return cache!;
  });
  return loading;
}

export async function zipsForCity(city: string, stateCode: string): Promise<string[]> {
  await loadRows();
  return byCityState!.get(`${city.toLowerCase()}|${stateCode.toUpperCase()}`) ?? [];
}

export async function lookupZip(zip: string): Promise<{ city: string; stateCode: string } | null> {
  await loadRows();
  return byZip!.get(zip.padStart(5, "0")) ?? null;
}
