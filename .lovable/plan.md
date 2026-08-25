# Basic AI Visibility Score step in the Find & Claim flow

Insert a free "Basic AI Visibility Score" moment between finding the business and showing the $49.95 benefits, so the price is framed as the fix for a visible problem.

## New flow

1. **Search headline** changes to:
   "This search is free — takes 10 seconds, no card required — to see your Basic AI Visibility Score. If your business is found, you'll see membership benefits available to increase your AI Visibility Score."
2. Visitor searches, picks their business (or enters it manually) — unchanged.
3. **New question card:** "Does your business have a website?"
   - **Yes** → website field (pre-filled when Google already returned one), Continue.
   - **No** → continue straight through.
4. **Calculating animation** (~3 s): "BUSINESS NAME — we're calculating your Basic AI Visibility Score", with rotating status lines (checking business listing data, checking website presence, checking AI-readable structured data, checking review signals).
5. **Score reveal:** circular gauge in the existing navy/gold badge style showing e.g. `35/100`, plus a one-paragraph plain-language explanation tailored to the score band and to whether they have a website.
6. **CTA:** "See how to boost your AI Visibility Score on ChatGPT and other AI Answer Engines →" which reveals the existing benefits panel and $49.95 checkout (no page change, just scroll/animate to it).
7. **Scarcity notice** above the pay button: a subtle amber bar — "This $49.95 founding-member rate is tied to this session. Leave this page and membership in the AI Business Alliance returns to $149.95."

## How the Basic Score is calculated

Instant and deterministic — no AI call, no web crawl (those stay in the paid/admin audit). It scores the signals we already have from the Google Places result plus the website answer, starting at 100 and deducting, then clamped to a 12–72 range so a free basic score never reads as "already perfect":

| Signal | Weight |
|---|---|
| Website exists | 25 |
| Business found in Google listing data (name + address) | 15 |
| Phone number present | 10 |
| Category/type classified | 10 |
| Complete address incl. ZIP | 10 |
| Structured data / schema readable by AI engines | 15 — always 0 at this stage (we have no crawl), which is the core gap the membership fills |
| Dedicated AI-citable knowledge-graph page | 15 — always 0 until they join |

So a typical business with a site, phone and address lands around 60–70; without a website, around 35–45. Copy explains it as a *basic* score based on public listing signals, and that a full audit (crawl + AI answer-engine testing) is part of the membership — accurate, and it keeps the free step fast and free of API cost.

## Technical notes

- All work is in `src/components/biz/BusinessClaimSearch.tsx`: add a `phase` state (`search` → `website` → `calculating` → `score` → `benefits`) driving what renders; existing `preparing`/benefits UI stays intact and just moves behind the new phases.
- New `src/lib/basic-visibility-score.ts` — pure function `basicVisibilityScore({ hasWebsite, phone, address, postalCode, category, foundOnGoogle })` returning `{ score, factors[], paragraph }`. No server call, no cost.
- Score gauge reuses `buildScoreBadgeSvg` from `src/lib/score-badge.ts` (already exists) rendered inline at a small size, so the free score looks identical to the paid audit badge.
- Website answer is carried into the claim payload and the `/quick-pay` prefill so nothing is re-asked.
- No database changes, no new secrets.
