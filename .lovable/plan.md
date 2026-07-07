
## Goals

1. Make the image-size spec (**1216 × 896 px, 4:3**) unmissable on the submit page.
2. Give submitters a "I'm not ready — remind me later" option that emails them a link back to the submit page with their token.
3. After a successful submission, email the submitter a confirmation containing their unique shareable ad URL (`/ad/{ad_number}`) and ad number.

## 1. Emphasize image size on `/submit`

In `src/routes/submit.tsx`, replace the current small "Recommended" note with a prominent spec callout above the file input:

- Large badge/heading: **"Image must be 1216 × 796 px (4:3)"** — bold, brand color, with icon.
- Sub-bullets: JPG/PNG/WebP, under 2 MB, include logo + business name + services + phone, avoid tiny text.
- Add a client-side check on file selection that reads the image dimensions and shows a **warning** (not a hard block) if it isn't 1216×896 or 4:3 ratio, so submitters know before uploading.

## 2. "I'm not ready" flow

On `/submit` (verified state), add a secondary button under the form: **"I'm not ready — remind me later"**.

- Clicking it calls a new server fn `scheduleSubmissionReminder({ token })` that:
  - Verifies token is paid + not used.
  - Enqueues a transactional email using the existing `enqueueTransactionalEmailInternal` (idempotency key `submit-reminder-{token}`).
- New email template `src/lib/email-templates/submit-reminder.tsx`:
  - Subject: "Your Get Biz Music ad is ready when you are"
  - Body reminds them of the 1216×896 spec, tips, and provides a big CTA button linking to `https://bizspotmusicad.lovable.app/submit?token={token}`.
  - Register in `src/lib/email-templates/registry.ts`.
- After success, show an on-page confirmation ("We've emailed you a link — submit whenever your image is ready.") and disable the form area.

Note: the token remains valid until used, so the same link works later. No DB schema change needed.

## 3. Submission confirmation email with shareable URL

The share URL uses `ad_number`, which is assigned only when an admin **approves** the submission (in `approveSubmission`, `src/lib/ads.functions.ts`). Two emails make this clean:

**a) Immediate "Submission received" email** (sent from `createSubmission`):
- New template `src/lib/email-templates/submission-received.tsx`.
- Confirms receipt, states 24-hour review SLA, echoes business name.
- No share URL yet (ad_number not assigned).
- Idempotency key: `submission-received-{submission_token}`.

**b) "Your ad is live" email** (sent from `approveSubmission` once `ad_number` is known):
- New template `src/lib/email-templates/ad-approved.tsx`.
- Shows the ad number and the shareable URL: `https://bizspotmusicad.lovable.app/ad/{ad_number}`.
- Copy encourages sharing on social, in email signatures, etc.
- Idempotency key: `ad-approved-{ad_id}`.

Both use `enqueueTransactionalEmailInternal` server-side (like the existing payment-receipt fallback) so no auth is needed.

## Technical details

Files to change:
- `src/routes/submit.tsx` — new size-spec callout, dimension warning, "Not ready" button + handler, post-reminder confirmation state.
- `src/lib/ads.functions.ts`:
  - In `createSubmission`, after successful insert, enqueue `submission-received` email.
  - In `approveSubmission`, after insert (using returned `ad_number`), enqueue `ad-approved` email. Requires selecting `contact_name, email` from the submission (already loaded as `sub`).
  - New exported `scheduleSubmissionReminder` server fn.
- `src/lib/email-templates/submit-reminder.tsx` — new.
- `src/lib/email-templates/submission-received.tsx` — new.
- `src/lib/email-templates/ad-approved.tsx` — new.
- `src/lib/email-templates/registry.ts` — register three new templates.

No DB migration, no RLS changes, no new secrets. Uses existing email infrastructure.
