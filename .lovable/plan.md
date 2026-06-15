# Business Advertising Site (adapted from Posadas Family Memories)

A professional business-advertising website that reuses the structure of [Posadas Family Memories](/projects/faa0796e-dbd0-4baa-b320-78d0bfa3337d) but swaps the personal/family theme for a corporate business directory. Local businesses (restaurants, lawyers, etc.) submit image or video ads through a self-serve form; admin approves them; approved ads rotate in the sliders for 1 year.

## Pages

- **/** — Home. Navbar, hero ("Advertise Your Business — $5/5s or $10/10s for a full year"), Image Ad Slider, Pricing Banner, Video Ad Slider, "Submit Your Ad" CTA, Featured Businesses banner, Footer.
- **/submit** — Self-serve ad submission form (image upload, business details, plan selection, terms). On submit → status "pending approval" + on-screen confirmation. Static placeholder pricing (no real checkout).
- **/admin** — Email/password auth. Approval queue: preview ad + business info, Approve / Reject buttons, list of currently-live ads with expiry dates, manual remove.

## Submission form fields

- Business name, contact name, phone, email, business website URL
- Industry (restaurant, lawyer, salon, auto, retail, services, other)
- Ad type: **Image $5 / 5 sec** or **Slider Image $10 / 10 sec** (static pricing — no payment processor)
- File upload (image, recommended **1200×628 px JPG/PNG, under 2 MB**; helper text shown)
- Optional short tagline (max 80 chars)
- Terms checkbox (no adult, illegal, or misleading content)
- Zod validation client + server

## Admin approval flow

- New submissions land in `ad_submissions` with `status = 'pending'`.
- Admin reviews → Approve creates row in `ads` table with `starts_at = now()`, `expires_at = now() + 1 year`, `status = 'active'`. Reject sets `status = 'rejected'` with optional reason.
- Home page sliders read only `ads` where `status='active' AND expires_at > now()`, ordered randomly per load.
- Expired ads auto-hidden by query filter.

## Visual theme

Professional / corporate, not the family watercolor look:

- Background: clean light gray / white with subtle navy gradient accents (no watercolor PNG)
- Primary: deep navy `#0F2A4A`
- Accent: gold `#D4A24C` for pricing and CTAs
- Typography: Inter for body, a serious serif (e.g. Fraunces) for headlines
- Cards: white with soft shadow, rounded-2xl, subtle border
- Pricing pills with gold border and navy text

## Placeholder content

Seeded on first load (or via migration): 6 image ads + 4 video ads using stock-style placeholders for:
- Tony's Pizzeria (restaurant)
- Hartwell & Associates Law (lawyer)
- Bella Hair Studio (salon)
- Apex Auto Repair (auto)
- Sunrise Dental (healthcare)
- GreenLeaf Landscaping (services)
- (Plus video versions for a subset)

Placeholder images generated via imagegen and uploaded as CDN assets.

## What's reused vs dropped from Posadas

**Reused (adapted):** Navbar, Hero, PhotoSlider→ImageAdSlider, VideoSlider→VideoAdSlider, Footer, AdminLogin, AdminPanel pattern, Supabase auth + RLS, useSiteSettings hook pattern.

**Dropped:** MiniPlayer, PlaylistMarquee, AmazonSlider, BurialBanner, InsuranceBanner, AdSenseZone, Google Drive sync, YouTube import, Amazon products — these are family/personal features that don't fit a B2B ad site.

**Added:** /submit page, ad submission storage bucket, approval queue UI, pricing banner, expiry filtering.

---

## Technical details

### Stack
- TanStack Start (existing template) + Tailwind v4
- **Lovable Cloud** (must enable) for auth, database, file storage

### Database (Lovable Cloud migration)

```sql
-- ad submissions (raw user input, pending review)
create table public.ad_submissions (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  website_url text,
  industry text not null,
  tagline text,
  ad_type text not null check (ad_type in ('image_5','slider_10')),
  image_path text not null,           -- storage path in 'ad-uploads' bucket
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  created_at timestamptz default now()
);

-- approved live ads
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.ad_submissions(id) on delete set null,
  business_name text not null,
  website_url text,
  tagline text,
  industry text not null,
  ad_type text not null,
  image_url text not null,            -- public URL
  duration_seconds int not null,      -- 5 or 10
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','removed'))
);

-- user roles (admin) — standard separate-table pattern
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
```

Plus required GRANTs, `has_role()` security-definer function, RLS:
- `ads`: public SELECT where `status='active' AND expires_at > now()`; admin full access.
- `ad_submissions`: anyone can INSERT; only admin can SELECT/UPDATE.
- `user_roles`: authenticated SELECT own row; admin manages.
- Storage bucket `ad-uploads` (public read for approved file URLs).

### Routes
- `src/routes/index.tsx` — home
- `src/routes/submit.tsx` — submission form
- `src/routes/admin.tsx` — auth + approval panel

### Components (`src/components/biz/`)
Navbar, Hero, ImageAdSlider, VideoAdSlider, PricingBanner, FeaturedBusinesses, Footer, SubmitForm, AdminLogin, AdminPanel (approval queue + live ads list).

### Assets
- Copy `banner_*.png.asset.json` from Posadas only if relevant (likely not — generate fresh professional banner via imagegen).
- Generate 6 placeholder business images via imagegen, upload as Lovable assets.

### Out of scope
- No real Stripe/Paddle checkout (user said static placeholder pricing).
- No actual ad-display analytics, click tracking, or invoicing.
- No email notifications on approve/reject (can be added later).

When you approve this plan I'll enable Lovable Cloud and start building.
