# SEC Engineering Career Fair

The public site for the Texas A&M SEC Engineering Career Fair, plus **Site Studio** (`/admin`), a visual editor in the style of Squarespace or Wix.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint (Next.js core-web-vitals + TypeScript rules)
npm run build    # production build + type check
```

Open `/` for the site and `/admin` for the studio.

> **The studio currently has no sign-in.** Anyone with the `/admin` link can edit and publish. Google OAuth is planned; it plugs into `isAuthorized()` in `lib/auth.ts`, which every studio route already checks.

## Pages

| URL | Contents |
| --- | --- |
| `/` | Hero, fair-week dates, student/recruiter pathways, stats, location, team, contact |
| `/students` | Complete student guide: dates, registration, Pre-Career Fair Week, Company Chat, Welcome Social, itinerary, dress code, shuttle & parking, company search, headshots, virtual fair, preparation, FAQs, contact |
| `/recruiters` | Complete recruiter guide: deadlines, registration, pricing, payment & tax ID, refunds, pre-fair events, itinerary, parking, booth & shipping, interview rooms, virtual fair, hotels, FAQs, contact |
| `/career-discovery-fair` | Career Discovery Fair details for companies |

Guide pages have a sticky "On this page" menu that tracks your position as you scroll (on phones it becomes a dropdown). **Site search** (header button, ⌘K/Ctrl K, or `/`) covers every visible section and item on every page; FAQ results open the matching answer. Old URLs from the previous site (`/student-*`, `/recruiter-*`, `/student`) redirect to the matching guide.

## Using Site Studio

- **Edit text**: click any text on the page and type. In paragraph text, select words to get the formatting bar (bold, italic, underline, subheading, lists, link). ⌘K adds a link.
- **Images**: click an image to choose one from the media library or upload a new one, or drag a photo from your computer straight onto it. Large photos are resized automatically. Always fill in the alt text.
- **Links and buttons**: click **Edit link** to set the destination. You can pick any page or section, or paste a URL.
- **Lists** (schedule rows, FAQs, cards, team members, and so on): hover an item to move, duplicate, or delete it, or drag its handle. **+ Add** creates a new one.
- **Sections**: drag them in the left **Sections** panel (or press Alt+↑/↓). The bar above each section on the canvas can move, hide, duplicate, or delete it. **+ Add section** opens the block library.
- **Inspector** (right panel): section settings (visibility, menu label and group, background, anchor), plus a form for every field, including URLs and alt text.
- **Pages**: add, rename, or delete pages, or change their URLs. **Site**: header menu, header button, announcement bar, footer.
- **Saving**: edits autosave as a draft that only the studio can see. **Publish** makes them live. **History** restores any earlier publish. ⌘Z / ⌘⇧Z undo and redo.
- **Preview**: toggle desktop, tablet, or phone width, or use **Preview** to see the page without editing controls.

## How it works

| Path | Role |
| --- | --- |
| `lib/content/types.ts` | Content model: pages made of typed blocks (hero, schedule, cards, FAQ, …). |
| `lib/content/blocks.ts` | Block library: labels, descriptions, and starter content for each block type. |
| `lib/content/defaults.ts` | Starting content, adapted from the previous careerfair.sec.tamu.edu site. |
| `lib/content/normalize.ts` | Validates and sanitizes every save against the block schema. |
| `lib/content/store.ts` | Neon reads/writes: draft, published, revisions. |
| `lib/content/search.ts` | Builds and ranks the site-search index. |
| `lib/sanitize.ts` | Allowlist sanitizer for rich text and link URLs. |
| `lib/media.ts`, `lib/request.ts` | Upload validation and the guards shared by studio API routes. |
| `lib/auth.ts` | `isAuthorized()`, the single hook for adding sign-in. |
| `components/site/*` | Public site: page shell, block renderers, search, links. |
| `components/edit/context.tsx` | Makes the same renderers editable in place inside the studio. |
| `components/studio/*` | The studio: shell, panels, inspector, dialogs, rich-text toolbar. |

- Content and uploads are stored in Neon: `site_content` (draft + published), `site_revisions`, and `media_files`. Images are served from `/api/media/<id>`. The tables are created automatically on first use, or with `npm run db:migrate`.
- Public pages are statically generated and refreshed when you publish.
- Every studio API route checks `isAuthorized()`, rejects cross-site requests, and requires JSON bodies. Uploads are checked against their real file contents; SVGs with scripts or external links are refused and served sandboxed.
- Security headers (no framing, `nosniff`, referrer and permissions policies) are set for every route in `next.config.ts`.

## Deploying (Vercel + Neon)

1. Set `DATABASE_URL` (Neon).
2. Production uses the `production` schema (through `VERCEL_ENV=production` or `APP_ENV=production`). Previews and local development use `development`.
