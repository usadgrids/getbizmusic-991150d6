import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import type { DirectoryCategory, DirectoryPlace } from "@/lib/directory-categories";
import { DIRECTORY_LABELS } from "@/lib/directory-categories";

export function DirectoryList({
  category,
  places,
}: {
  category: DirectoryCategory;
  places: DirectoryPlace[];
}) {
  if (!places.length) return null;
  const label = DIRECTORY_LABELS[category];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10" aria-labelledby="directory-heading">
      <h2 id="directory-heading" className="text-2xl font-bold tracking-tight text-foreground">
        {label.title} Guide — San Diego County
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Verified hours, services and answers for the businesses advertising on GetBizMusic.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <li key={place.id}>
            <Link
              to={`${label.basePath}/${place.slug}`}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-md"
            >
              <span className="text-base font-semibold text-card-foreground">{place.name}</span>
              {(place.city || place.state) && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {[place.city, place.state].filter(Boolean).join(", ")}
                </span>
              )}
              {place.summary && (
                <span className="mt-2 line-clamp-3 text-sm text-muted-foreground">{place.summary}</span>
              )}
              <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {place.price_range && <span className="font-medium">{place.price_range}</span>}
                {place.rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3" aria-hidden />
                    {place.rating}
                    {place.review_count ? ` (${place.review_count})` : ""}
                  </span>
                )}
                {place.cuisines.slice(0, 3).map((c) => (
                  <span key={c} className="rounded-full bg-muted px-2 py-0.5 capitalize">
                    {c}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
