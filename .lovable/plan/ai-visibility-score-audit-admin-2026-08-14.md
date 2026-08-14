# AI Visibility Score Audit (Admin)

A new admin tool that researches any business on the web, scores how visible it is to AI answer engines, and generates a downloadable circular badge PNG:
**"87/100 AI VISIBILITY SCORE — audited by www.GetBizMusic.com"**

## How it works for you

1. Go to `/admin` → new **AI Visibility Score Audit** section.
2. Pick a business two ways:
   - **Existing advertiser** — dropdown of your live ads / Knowledge Graph listings (auto-fills name, city, website).
   - **New prospect** — type a business name, city/state, and optional website.
3. The prompt is already written and pre-populated in the box (editable before running):
   *"Research everything you can on the internet about this business and give it an AI Optimization score audit…"*
4. Click **Run AI Visibility Audit**. It scrapes the web, then returns:
   - An overall score out of 100
   - Sub-scores: Web Presence, Reviews & Reputation, Structured Data / Schema, Content & Q&A Answerability, Local Consistency (NAP), AI Citability
   - 3–6 strengths and 3–6 fix-it recommendations, written in plain language you can paste into an email
5. Click **Download badge PNG** to get the circular score graphic (transparent-friendly, 1000×1000).

## The badge design

Circular gauge in your Navy & Gold brand colors: a ring that fills proportionally to the score, big score number in the center (`87` over `/100`), "AI VISIBILITY SCORE" beneath it, and "audited by www.GetBizMusic.com" on the bottom curve. Color of the ring shifts by band (gold for 80+, amber 60–79, red below 60). Download only — nothing is published to the business's public page.

## Technical notes

- **New file `src/lib/ai-audit.server.ts`** — reuses the existing Firecrawl helpers pattern from `directory.server.ts`: a `search` for the business (site, reviews, listings, directories) plus a `scrape` of its website when a URL is known, then one Lovable AI Gateway call (`google/gemini-3-flash-preview`, JSON mode) returning a strict typed shape: `{ overall, subscores[], strengths[], recommendations[], summary }`. Scores clamped 0–100 server-side.
- **New file `src/lib/ai-audit.functions.ts`** — `adminRunVisibilityAudit` server fn with `requireSupabaseAuth` + `assertAdmin`, matching the existing pattern in `directory.functions.ts`. Input: `{ adId? , businessName, city?, state?, website?, prompt? }`.
- **New file `src/components/admin/VisibilityAuditSection.tsx`** — advertiser dropdown (fed by a small admin list fn over `ads` + `food_places`) plus free-text fields, pre-populated prompt textarea, results panel, badge preview and download button. Rendered in `src/routes/admin.index.tsx` under the Knowledge Graph section.
- **New file `src/lib/score-badge.ts`** — builds the badge as an SVG string from the score, then converts it to PNG in the browser (`Image` + `canvas.toBlob`) for download. The server runtime has no canvas, so PNG rasterization happens client-side; the SVG is deterministic so the output is identical for everyone.
- No database changes and no new secrets — `FIRECRAWL_API_KEY` and `LOVABLE_API_KEY` are already configured.
- No public routes or public data exposure; the whole tool is admin-gated.
