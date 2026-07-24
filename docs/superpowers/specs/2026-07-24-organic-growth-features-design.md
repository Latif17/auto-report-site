# Organic Growth Features Spec

## Overview
A single WhatsApp blast to the community group produced 35 sign-ups, but growth has since flatlined. Of the roughly 2,300 homes in Barking Riverside, only ~512 are even in the general community WhatsApp chat, and only 119 of those have joined the smell-specific chat — meaning a large majority of the addressable population has never been reached by any channel used so far, and further growth can't come from re-messaging the same group.

The goal here is **organic, zero-ongoing-effort growth**: features built once that keep working without the maintainer actively marketing. This spec covers four additions, all either static content/metadata or one-tap client-side actions — no ongoing operational cost.

## 1. SEO metadata & Open Graph tags (site-wide)
- Add `<meta name="description">`, refreshed `<title>` tags, and Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) + Twitter Card meta tags to `index.html`, `dashboard.html`, and the new info page (see §2).
- Titles/descriptions should use the phrasing residents actually search (e.g. "Barking smell", "Barking Riverside smell report", "report smell Barking Riverside") rather than the current stylized branding-only titles ("Stink Log | Barking Stink").
- Static HTML `<head>` changes only — no backend involvement for `index.html`/the info page.

## 2. Landing/info page (`about-the-smell.html`)
- New static page explaining the backstory: the 20-year history, the suspected culprits (ReFoods UK, East London BioGas, Veolia), why reporting matters, and a clear link/CTA to the report form. Content adapted from the README's "Why this repo exists" section, rewritten for residents rather than developers.
- Embeds a short demo video/clip (recorded by the maintainer, not built here) showing an actual form submission end-to-end with a visible timer, framed as "takes under X seconds — saves you filling out GOV.UK's 19-page form yourself." This is the concrete answer to "why should I bother" for a skeptical visitor arriving from search.
- Linked from the homepage nav/footer.
- This page is the primary SEO target — it's the content Google will rank for informational searches from residents who don't yet know the tool exists.

## 3. Share button after successful submission
- On the success state shown after a report is submitted (`index.html` / `app.js`), add a "Share with a neighbour" button.
- Uses `navigator.share()` with a pre-filled message (short description + homepage URL) so the OS's native share sheet opens and the user picks whichever app they want (WhatsApp, Messages, email, etc.) — no hardcoded destination.
- Fallback for browsers without `navigator.share` support (mainly desktop): a "Copy link" button that copies the same message + URL to the clipboard.
- No click tracking or referral attribution — kept simple and privacy-consistent with the project's existing PII stance.

## 4. Dashboard social preview
- Add Open Graph tags to `dashboard.html` so links shared in Nextdoor/Facebook/etc. render a real preview card instead of a bare URL.
- `og:image` uses a static branded image (can't be dynamically generated per-request without new image-rendering infra, which is out of scope here).
- `og:description` should reflect live numbers (e.g. "1,204 reports logged by X households in Barking Riverside"), which requires server-side rendering of the meta tag — most social-media link crawlers don't execute client-side JS, so the existing client-side `/api/dashboard-stats` fetch in `dashboard.html` won't populate it in time for crawlers.
  - Implementation: add a `GET /dashboard.html` route in `server.js`, registered **before** the `express.static` middleware (server.js:45) so it takes precedence for that exact path. The route reads `dashboard.html` from disk, fetches the same stats used by `/api/dashboard-stats`, injects them into the `og:description` meta tag, and sends the resulting HTML. All other static assets continue to be served by `express.static` unaffected.

## Out of scope
- Any paid promotion, physical flyering, or outreach requiring ongoing effort from the maintainer.
- Referral tracking/attribution or gamification (leaderboards, invite codes) — adds complexity and PII-adjacent surface area without a clear ask from the maintainer.
- Dynamic per-request OG image generation (e.g. an image showing live stats) — static image only, for now.
