# Add the AI Business Alliance to the Home Page

## Goal
Put the GetBizMusic.com AI Business Alliance membership story on the front page in the existing navy-and-gold style, and give it a full detail page for the complete flyer content. Joining routes to the existing `/pricing` checkout — no new payment product.

## 1. New home page section (`src/routes/index.tsx`)

Placed between the category card grid and the footer, so visitors first pick a category, then learn about membership.

Content, taken from the flyer:
- Eyebrow chip: "AI Business Alliance"
- Heading: "Increase Visibility. Build Credibility. Grow with AI."
- One-line intro: get seen, recommended, and trusted by AI tools, consumers, and business partners.
- Six benefit cards (icon + title + one line each):
  1. Get Recommended by AI — appear as a top local recommendation in AI tools like ChatGPT
  2. Visibility via Music — reach consumers streaming on category pages (/food, /beauty, and more)
  3. Professional Ad Creation — professionally designed graphic ads
  4. B2B Discovery Directory — connect with other trusted alliance businesses
  5. Build Business Trust — verified entity so AI tools see you as legitimate
  6. Always-Current Info — regular audits keep your data correct
- Price band: "Special Launch Price — $49.95 / Annual Membership" with the "prices subject to change" note.
- Two CTAs: gold "Join the Alliance" → `/pricing`, outline "See full membership details" → `/alliance`.

Styling reuses the page's existing tokens: navy `#0F2A4A` / `#153a66` surface, gold `#D4A24C` / `#F4C430` accents, Sora headings, Manrope body, rounded cards with gold hover borders. Icons come from lucide-react (Bot, Music, Palette, Network, ShieldCheck, RefreshCw).

Home `head()` description is updated to mention the AI Business Alliance.

## 2. New page: `/alliance` (`src/routes/alliance.tsx`)

Full flyer content, same navbar/footer chrome:
- Hero: "GetBizMusic.com AI Business Alliance" + tagline + mission line.
- Our Goals — the six benefits, expanded.
- Who Can Join — verified local businesses, B2B providers, licensed independent professionals in good standing.
- Alliance Terms — category placement; no custom audio production (popular music is streamed); authorization to use and format public business details; honest practices, no fake listings or spam.
- Membership Fees — $49.95 annual launch price + terms note, with the "Join the Alliance" CTA to `/pricing`.
- Contact card — Ralph T. Posadas, President, ralph@getbizmusic.com, Text/SMS (619) 707-0467 (mailto and sms links).
- Its own `head()` metadata (title, description, og:title, og:description, og:type, twitter:card, canonical `https://getbizmusic.com/alliance`) plus JSON-LD `Organization` / `Offer` describing the $49.95 annual membership so AI engines can read it.

## 3. Navigation

Add an "Alliance" link to `BizNavbar` (desktop and mobile menus) pointing to `/alliance`.

## Notes
- No payment or database changes. "Join the Alliance" uses the existing `/pricing` checkout.
- The uploaded PDF is used as source copy only; it is not embedded as an asset.
- Sitemap: add `/alliance` to `src/routes/sitemap[.]xml.ts` if it lists static routes.

## Verification
- Typecheck passes.
- `/` shows the Alliance section with the six benefits and both CTAs; `/alliance` renders the full flyer; navbar link works on desktop and mobile; no horizontal overflow on mobile.
