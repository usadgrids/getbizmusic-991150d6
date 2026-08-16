import { isSanDiegoCountyZip, OUT_OF_AREA_MESSAGE } from "./san-diego-zips";

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
};

export type PlaceSearchResponse =
  | { served: false; message: string; results: [] }
  | { served: true; message?: string; results: PlaceResult[] };

/** Bounding box covering San Diego County. */
const SD_COUNTY_BOUNDS = {
  low: { latitude: 32.5121, longitude: -117.6062 },
  high: { latitude: 33.5051, longitude: -116.0806 },
};

export async function searchSanDiegoBusinesses(
  businessName: string,
  zip: string,
  category?: string,
): Promise<PlaceSearchResponse> {
  // Validate ZIP BEFORE spending an API call.
  if (!isSanDiegoCountyZip(zip)) {
    return { served: false, message: OUT_OF_AREA_MESSAGE, results: [] };
  }

  const apiKey = process.env["GOOGLE_PLACES_API_KEY"];
  if (!apiKey) {
    return { served: true, message: "Business search is not configured yet.", results: [] };
  }

  // Category is a relevance hint inside the free-text query only — never a
  // hard filter, since Google's own "type" field is unreliable.
  const categoryHint = category && category.toLowerCase() !== "other" ? ` ${category}` : "";

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery: `${businessName}${categoryHint} ${zip}`,
      maxResultCount: 10,
      locationRestriction: { rectangle: SD_COUNTY_BOUNDS },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Places search failed", res.status, detail.slice(0, 300));
    return { served: true, message: "Search is temporarily unavailable. Please try again.", results: [] };
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      websiteUri?: string;
      nationalPhoneNumber?: string;
    }>;
  };

  const results: PlaceResult[] = (json.places ?? []).slice(0, 10).map((p) => ({
    placeId: p.id ?? "",
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
  }));

  return {
    served: true,
    message: results.length === 0 ? "No matching businesses found for that name and ZIP." : undefined,
    results,
  };
}
