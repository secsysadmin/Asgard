# SEC Engineering Career Fair

The public site for the Texas A&M SEC Engineering Career Fair, plus **Site Studio** (`/admin`), a visual editor in the style of Squarespace or Wix.

## Run locally

```bash
npm install
npm run dev
```

Open `/` for the site and `/admin` for the studio. Locally, the studio is open unless `ADMIN_PASSWORD` is set.

## Pages

| URL | Contents |
| --- | --- |
| `/` | Hero, fair-week dates, student/recruiter pathways, stats, location, team, contact |
| `/students` | Complete student guide: dates, registration, Pre-Career Fair Week, Company Chat, Welcome Social, itinerary, dress code, shuttle & parking, company search, headshots, virtual fair, preparation, FAQs, contact |
| `/recruiters` | Complete recruiter guide: deadlines, registration, pricing, payment & tax ID, refunds, pre-fair events, itinerary, parking, booth & shipping, interview rooms, virtual fair, hotels, FAQs, contact |
| `/career-discovery-fair` | Career Discovery Fair details for companies |

Guide pages have a sticky "On this page" menu that tracks your position as you scroll (on phones it becomes a dropdown). Old URLs from the previous site (`/student-*`, `/recruiter-*`, `/student`) redirect to the matching guide.

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

- `lib/content/types.ts` defines the content model: pages made of typed blocks (hero, schedule, cards, FAQ, and so on).
- `lib/content/defaults.ts` holds the starting content, adapted from the previous careerfair.sec.tamu.edu site.
- `components/site/*` renders the public site. `components/edit/context.tsx` makes the same components editable in place when they're rendered inside the studio.
- `lib/content/normalize.ts` validates every save against the block schema, and `lib/sanitize.ts` allowlists rich-text HTML.
- Content and uploads are stored in Neon: `site_content` (draft + published), `site_revisions`, and `media_files`. Images are served from `/api/media/<id>`. The tables are created automatically on first use, or with `npm run db:migrate`.
- Public pages are statically generated and refreshed when you publish.

## Deploying (Vercel + Neon)

1. Set `DATABASE_URL` (Neon).
2. **Set `ADMIN_PASSWORD`.** Deployed studios refuse all sign-ins without it.
3. Production uses the `production` schema (through `VERCEL_ENV=production` or `APP_ENV=production`). Previews and local development use `development`.
