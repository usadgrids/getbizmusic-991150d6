import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Globe, CalendarCheck, Star, ArrowLeft } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import {
  DAY_ORDER,
  DIRECTORY_LABELS,
  schemaTypeFor,
  type DirectoryCategory,
  type DirectoryFaq,
  type DirectoryPlace,
} from "@/lib/directory-categories";

const SITE = "https://www.getbizmusic.com";

function titleCase(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function attributeEntries(attributes: DirectoryPlace["attributes"]) {
  return Object.entries(attributes)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))
    .slice(0, 24)
    .map(([k, v]) => [
      titleCase(k),
      Array.isArray(v)
        ? v.map(String).join(", ")
        : typeof v === "boolean"
          ? v
            ? "Yes"
            : "No"
          : typeof v === "object"
            ? Object.entries(v as Record<string, unknown>)
                .map(([sk, sv]) => `${titleCase(sk)}: ${String(sv)}`)
                .join(", ")
            : String(v),
    ]) as Array<[string, string]>;
}

export function buildPlaceJsonLd(
  category: DirectoryCategory,
  place: DirectoryPlace,
  faqs: DirectoryFaq[],
  industry?: string | null,
) {
  const base = DIRECTORY_LABELS[category].basePath;
  const url = `${SITE}${base}/${place.slug}`;

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaTypeFor(category, industry),
    name: place.name,
    url,
    description: place.summary ?? place.description ?? undefined,
    image: place.image_url ?? undefined,
    telephone: place.phone ?? undefined,
    priceRange: place.price_range ?? undefined,
    ...(category === "food"
      ? { servesCuisine: place.cuisines.length ? place.cuisines : undefined }
      : { makesOffer: place.cuisines.map((s) => ({ "@type": "Offer", name: s })) }),
    address: place.address
      ? {
          "@type": "PostalAddress",
          streetAddress: place.address,
          addressLocality: place.city ?? undefined,
          addressRegion: place.state ?? undefined,
          postalCode: place.zip ?? undefined,
          addressCountry: "US",
        }
      : undefined,
    geo:
      place.lat != null && place.lng != null
        ? { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng }
        : undefined,
    openingHoursSpecification: DAY_ORDER.filter((d) => place.hours?.[d]).map((d) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${titleCase(d)}`,
      description: place.hours[d],
    })),
    sameAs: place.source_urls?.length ? place.source_urls : undefined,
    aggregateRating:
      place.rating != null
        ? {
            "@type": "AggregateRating",
            ratingValue: place.rating,
            reviewCount: place.review_count ?? undefined,
          }
        : undefined,
  };

  const graph: unknown[] = [
    business,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GetBizMusic", item: SITE },
        { "@type": "ListItem", position: 2, name: DIRECTORY_LABELS[category].title, item: `${SITE}${base}` },
        { "@type": "ListItem", position: 3, name: place.name, item: url },
      ],
    },
  ];

  if (faqs.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return graph;
}

export function DirectoryPlaceView({
  category,
  place,
  faqs,
}: {
  category: DirectoryCategory;
  place: DirectoryPlace;
  faqs: DirectoryFaq[];
}) {
  const label = DIRECTORY_LABELS[category];
  const attrs = attributeEntries(place.attributes ?? {});
  const verified = place.last_crawled_at
    ? new Date(place.last_crawled_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const mapQuery = encodeURIComponent(
    [place.name, place.address, place.city, place.state].filter(Boolean).join(" "),
  );

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPlaceJsonLd(category, place, faqs)),
        }}
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <Link
          to={label.basePath === "/food" ? "/food" : "/beauty"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {label.title}
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {place.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {(place.city || place.state) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden />
                {[place.address, place.city, place.state, place.zip].filter(Boolean).join(", ")}
              </span>
            )}
            {place.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4" aria-hidden /> {place.rating}
                {place.review_count ? ` · ${place.review_count} reviews` : ""}
              </span>
            )}
            {place.price_range && <span>{place.price_range}</span>}
          </p>
        </header>

        {place.image_url && (
          <img
            src={place.image_url}
            alt={`${place.name} advertisement on GetBizMusic`}
            loading="lazy"
            className="mt-6 w-full rounded-xl border border-border object-cover"
          />
        )}

        {(place.description || place.summary) && (
          <section className="mt-6">
            <p className="text-base leading-relaxed text-foreground">
              {place.description ?? place.summary}
            </p>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {place.phone && (
            <a
              href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Phone className="h-4 w-4" aria-hidden /> {place.phone}
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Globe className="h-4 w-4" aria-hidden /> Website
            </a>
          )}
          {place.booking_url && (
            <a
              href={place.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden /> Book now
            </a>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <MapPin className="h-4 w-4" aria-hidden /> Directions
          </a>
        </div>

        {!!place.cuisines.length && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">
              {category === "food" ? "Cuisine & specialties" : "Services offered"}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {place.cuisines.map((c) => (
                <li key={c} className="rounded-full bg-muted px-3 py-1 text-sm capitalize">
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {DAY_ORDER.some((d) => place.hours?.[d]) && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Hours</h2>
            <table className="mt-3 w-full max-w-md text-sm">
              <tbody>
                {DAY_ORDER.filter((d) => place.hours?.[d]).map((d) => (
                  <tr key={d} className="border-b border-border/60">
                    <th scope="row" className="py-2 text-left font-medium capitalize">
                      {d}
                    </th>
                    <td className="py-2 text-right text-muted-foreground">{place.hours[d]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!!attrs.length && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Good to know</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {attrs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm">
                  <dt className="font-medium">{k}</dt>
                  <dd className="text-right text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {!!faqs.length && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Frequently asked questions</h2>
            <div className="mt-3 space-y-4">
              {faqs.map((f) => (
                <div key={f.question} className="rounded-lg border border-border p-4">
                  <h3 className="text-base font-semibold text-foreground">{f.question}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          Source: getbizmusic.com{verified ? ` — last verified ${verified}` : ""}. {place.name}{" "}
          advertises on the GetBizMusic streaming network.
        </p>
      </main>

      <BizFooter />
    </div>
  );
}
