/**
 * Basic AI Visibility Score — instant, deterministic, zero-cost.
 *
 * This is the free teaser score shown right after a visitor finds their
 * business. It only scores signals we already hold (Google Places result +
 * the "do you have a website?" answer). The deep audit (Firecrawl crawl +
 * AI answer-engine testing) stays in the paid/admin flow.
 */

export type BasicScoreInput = {
  hasWebsite: boolean;
  phone?: string;
  address?: string;
  postalCode?: string;
  category?: string;
  foundOnGoogle: boolean;
};

export type ScoreFactor = {
  label: string;
  earned: number;
  max: number;
  note: string;
};

export type BasicScoreResult = {
  score: number;
  factors: ScoreFactor[];
  paragraph: string;
};

const MIN_SCORE = 12;
const MAX_SCORE = 72;

export function basicVisibilityScore(input: BasicScoreInput): BasicScoreResult {
  const hasPhone = Boolean(input.phone && input.phone.trim().length >= 7);
  const hasAddress = Boolean(input.address && input.address.trim().length >= 8);
  const hasZip =
    Boolean(input.postalCode && /^\d{5}$/.test(input.postalCode.trim())) ||
    /\b\d{5}\b/.test(input.address ?? "");
  const hasCategory = Boolean(
    input.category && input.category.trim() && input.category.toLowerCase() !== "other",
  );

  const factors: ScoreFactor[] = [
    {
      label: "Business website",
      earned: input.hasWebsite ? 25 : 0,
      max: 25,
      note: input.hasWebsite
        ? "You have a website AI engines can read."
        : "No website found — AI engines have almost nothing of your own to cite.",
    },
    {
      label: "Public listing data",
      earned: input.foundOnGoogle ? 15 : 6,
      max: 15,
      note: input.foundOnGoogle
        ? "Your business appears in Google's verified business data."
        : "We couldn't confirm you in Google's verified business data.",
    },
    {
      label: "Contact phone",
      earned: hasPhone ? 10 : 0,
      max: 10,
      note: hasPhone ? "A public phone number is available." : "No public phone number detected.",
    },
    {
      label: "Category classification",
      earned: hasCategory ? 10 : 0,
      max: 10,
      note: hasCategory
        ? "Your business type is clearly classified."
        : "Your business type isn't clearly classified for AI engines.",
    },
    {
      label: "Complete address + ZIP",
      earned: hasAddress && hasZip ? 10 : hasAddress ? 5 : 0,
      max: 10,
      note:
        hasAddress && hasZip
          ? "Full local address signals are present."
          : "Your location data is incomplete for local AI answers.",
    },
    {
      label: "AI-readable structured data (schema)",
      earned: 0,
      max: 15,
      note: "No schema markup we can verify — this is the single biggest gap for AI citation.",
    },
    {
      label: "Dedicated AI-citable knowledge page",
      earned: 0,
      max: 15,
      note: "You don't yet have a knowledge graph page built for AI answer engines to quote.",
    },
  ];

  const raw = factors.reduce((sum, f) => sum + f.earned, 0);
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, raw));

  const paragraph = buildParagraph(score, input.hasWebsite);
  return { score, factors, paragraph };
}

function buildParagraph(score: number, hasWebsite: boolean): string {
  const websiteLine = hasWebsite
    ? "Your website helps, but on its own it isn't written in the structured, question-and-answer format AI answer engines pull from."
    : "Without a website of your own, AI answer engines have almost nothing they can quote about you — they fall back to whatever third-party listings happen to say.";

  if (score >= 55) {
    return `Your Basic AI Visibility Score is ${score} out of 100. You have solid public business signals — name, location and contact details are findable. ${websiteLine} You're missing the two heaviest-weighted pieces: verifiable schema markup and a dedicated, AI-citable knowledge page. That's why ChatGPT, Gemini, Perplexity and Google AI Overviews rarely name you when local customers ask for a business like yours.`;
  }
  if (score >= 35) {
    return `Your Basic AI Visibility Score is ${score} out of 100. Some of your business information is publicly findable, but it's scattered and inconsistent across sources. ${websiteLine} You have no verifiable schema markup and no dedicated AI-citable page, so when someone asks ChatGPT or another AI answer engine for a business like yours in San Diego County, your name is unlikely to come up.`;
  }
  return `Your Basic AI Visibility Score is ${score} out of 100. Right now there is very little that AI answer engines can confidently say about your business. ${websiteLine} With no structured data and no AI-citable page, tools like ChatGPT, Gemini and Perplexity will almost always recommend a competitor instead of you.`;
}
