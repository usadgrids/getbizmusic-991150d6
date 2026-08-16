import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, ExternalLink, MapPin } from "lucide-react";
import { BizFooter } from "@/components/biz/BizFooter";
import { FloatingHomeButton, FloatingBackButton } from "@/components/biz/FloatingHomeButton";
import {
  DIRECTORY_LABELS,
  schemaTypeFor,
  type DirectoryCategory,
  type DirectoryFaq,
  type DirectoryPlace,
} from "@/lib/directory-categories";

const SITE = "https://www.getbizmusic.com";

export type DirectoryTopicPage = {
  slug: string;
  label: string;
  title: string;
  question: string;
  answer: string;
  faqs: DirectoryFaq[];
  updatedAt: string | null;
  places: DirectoryPlace[];
};





export function buildTopicJsonLd(category: DirectoryCategory, topic: DirectoryTopicPage) {
  const base = DIRECTORY_LABELS[category].basePath;
  const url = `${SITE}${base}/${topic.slug}`;
  const graph: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: topic.question,
      description: topic.answer,
      url,
      numberOfItems: topic.places.length,
      itemListElement: topic.places.map((place, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": schemaTypeFor(category),
          name: place.name,
          url: `${SITE}${base}/${place.slug}`,
          telephone: place.phone ?? undefined,
          priceRange: place.price_range ?? undefined,
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
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GetBizMusic", item: SITE },
        {
          "@type": "ListItem",
          position: 2,
          name: DIRECTORY_LABELS[category].title,
          item: `${SITE}${base}`,
        },
        { "@type": "ListItem", position: 3, name: topic.title, item: url },
      ],
    },
  ];

  if (topic.faqs.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: topic.faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return graph;
}

export function DirectoryTopicView({
  category,
  topic,
}: {
  category: DirectoryCategory;
  topic: DirectoryTopicPage;
}) {
  const label = DIRECTORY_LABELS[category];
  // Compute "today" only after hydration — server and client may be in
  // different timezones, so deriving hours from new Date().getDay() during SSR
  // causes a hydration mismatch.
  const [dayKey, setDayKey] = useState<string | null>(null);
  useEffect(() => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    setDayKey(days[new Date().getDay()]!);
  }, []);
  const hoursToday = (place: DirectoryPlace) =>
    dayKey ? place.hours?.[dayKey] ?? "—" : "—";
  const verified = topic.updatedAt
    ? new Date(topic.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="gbm-navy-scope min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildTopicJsonLd(category, topic)) }}
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <Link
          to="/$city"
          params={{ city: category }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {label.title}
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {topic.question}
        </h1>

        <p className="mt-4 rounded-xl border-l-4 border-primary/60 bg-muted/50 px-4 py-4 text-lg leading-8 text-foreground">
          {topic.answer}
        </p>

        {verified && (
          <p className="mt-3 text-xs text-muted-foreground">
            Source: getbizmusic.com — last verified {verified}
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">
            {topic.places.length === 1 ? "The business" : `All ${topic.places.length} businesses`}{" "}
            offering {topic.label}
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Hours today</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Contact</th>
                </tr>
              </thead>
              <tbody>
                {topic.places.map((place) => (
                  <tr key={place.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <Link
                        to="/$city/$slug"
                        params={{ city: category, slug: place.slug }}
                        className="font-semibold text-primary underline underline-offset-2"
                      >
                        {place.name}
                      </Link>
                      {place.summary && (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                          {place.summary.slice(0, 140)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[place.city, place.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{hoursToday(place)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{place.price_range ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {place.phone && (
                          <a
                            href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}
                            className="inline-flex items-center gap-1 text-primary"
                          >
                            <Phone className="h-3.5 w-3.5" aria-hidden /> {place.phone}
                          </a>
                        )}
                        {place.booking_url && (
                          <a
                            href={place.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Book
                          </a>
                        )}
                        {place.address && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" aria-hidden /> {place.address}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {!!topic.faqs.length && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-foreground">Common questions</h2>
            <dl className="mt-4 space-y-4">
              {topic.faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <dt className="font-semibold text-foreground">{f.question}</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted-foreground">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </main>

      <BizFooter />
      <FloatingHomeButton />
      <FloatingBackButton />
    </div>
  );
}
