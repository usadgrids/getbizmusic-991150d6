// Shared "where should the ad appear" hand-off between the city picker,
// /pricing and /submit. Stored in sessionStorage so it survives the Stripe
// redirect round-trip.
export type CityTarget = { city: string; state: string; zip?: string };

const KEY = "gbm_target_city";

export function saveCityTarget(t: CityTarget) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* storage unavailable */
  }
}

export function readCityTarget(): CityTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CityTarget;
    if (!parsed?.city || !parsed?.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCityTarget() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
