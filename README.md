# SEC Engineering Career Fair

A responsive 2026 Texas A&M Engineering Career Fair site plus a local CMS-style admin foundation.

## Run locally

```bash
npm install
npm run dev
```

Open `/` for the public site and `/admin` for the editorial interface.

## Current content model

The public student and recruiter tabs live in `lib/site-content.ts`. The admin interface demonstrates real browser-local layout ordering, visibility toggles, copy fields, and image-preview replacement. It is deliberately isolated from the public rendering layer, so it can be promoted to authenticated server actions without redoing the visual site.

## Vercel + Neon handoff

1. Create a Neon database and populate `DATABASE_URL` from `.env.example`.
2. Run `npm run db:migrate`. This creates two schemas in the same database: `development` and `production`.
3. Set `APP_ENV=production` only for Vercel Production. Local and Vercel Preview use `development`; production selects `production` automatically through `VERCEL_ENV` or explicitly through `APP_ENV`.
4. Add authenticated admin access (for example, Auth.js or Clerk).
4. Replace the localStorage calls in `app/admin/page.tsx` with server actions that write `site_pages` and `page_sections`.
5. Store uploaded images in Vercel Blob or another object store; save their URLs in `media_assets`.

The supplied schema persists page ordering, visibility, navigation labels, editable JSON content, and media metadata—the core pieces needed for a Squarespace-style editor.

## Source material

The page structure and 2026 fair details were adapted from the live [SEC Career Fair site](https://www.careerfair.sec.tamu.edu/). Visual direction is inspired by the [Student Engineers' Council home site](https://home.sec.tamu.edu/).
