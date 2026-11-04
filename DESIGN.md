---
name: SEC Engineering Career Fair
description: An editorial, information-first fair site for Aggie engineers and recruiters.
colors:
  maroon: "#500000"
  maroon-dark: "#360000"
  cream: "#f5f1e8"
  paper: "#fbfaf6"
  ink: "#1f1a17"
  sand: "#e7d7c2"
  warm-white: "#faf7f2"
  brass: "#c7a66a"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(3rem, 6vw, 7.875rem)"
    fontWeight: 500
    lineHeight: 0.88
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  metadata:
    fontFamily: "DM Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  control: "4px"
  panel: "8px"
spacing:
  compact: "16px"
  section: "120px"
components:
  button-primary:
    backgroundColor: "{colors.maroon}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "12px 15px"
---

# Design System: SEC Engineering Career Fair

## Overview

**Creative North Star: "The Maroon Field Guide"**

The public site behaves like a well-designed event program: clear hierarchy, practical schedules, and a student-run operation with a refined editorial character. The admin surface shares the same seriousness but shifts into a quieter, operations-first utility mode.

## Colors

Maroon is the institutional anchor; warm white and cream carry the main surfaces, and muted brass accents the hero metadata and timeline interaction.

## Typography

Source Serif 4 gives page and section headings a sturdy editorial voice. Source Sans 3 carries body copy and functional information; DM Mono is reserved for metadata such as times and dates. The hero retains its Playfair Display and IBM Plex Sans typography.

## Layout

Public pages use a fluid gutter (6% of the page, 20–96px) and alternate expansive editorial moments with dense operational sections. Responsive rules are container queries on the `.site` wrapper, so the studio's device previews behave like real devices. Guide pages pair a sticky "On this page" sidebar (a dropdown under 960px) with the content column. The studio uses a top bar, a left panel rail, a centered canvas, and a right inspector.

The fair-week dates use a horizontal timeline that becomes vertical on narrower screens. Event statistics use large Source Serif numerals and stable labels.

## Elevation & Depth

Public surfaces are mostly flat; contrast and sectional changes create hierarchy. The admin uses restrained borders and one soft mobile navigation shadow only where overlap requires it.

## Shapes

Controls are modestly rounded (4px); panels use 8px. The site avoids decorative cards in favor of ruled lists, type, and whole-surface color blocks.

## Components

### Buttons

Primary buttons use maroon or warm-sand fills, direct action language, and a subtle arrow translation on hover.

### Navigation

The home header overlays the hero with a dark translucent surface, then changes to maroon on scroll. Other pages use solid maroon. White logos and navigation use horizontal links above 1100px, a Menu disclosure below; search collapses to an icon below 1280px. The studio's left rail switches between Sections, Pages, Media, Site, and History.

### Signature Component

Guide pages are the core information architecture: grouped section navigation, fact cards with icons, flowchart steps, and FAQ topic cards make logistics scannable.

### Home hero film

The home hero uses the career fair film as a full-bleed background with cover sizing at every viewport. A graduated dark scrim and a subtle maroon multiply tint support a centered upright Playfair Display event headline, with the event name and supporting copy in IBM Plex Sans. Organizer text is white. Dates, location, and audience actions sit over the darker bottom of the footage, separated by a fine rule. On phones the details and actions stack. No playback button is displayed; reduced motion and data saving show the still poster.

## Do's and Don'ts

- Do use a maroon, cream, ink, and warm-sand relationship; keep sand focused on moments of emphasis.
- Do use ruled lists for schedules, teams, and logistical information.
- Don’t use generic dashboard-card grids on the public site.
- Use gradient or translucent overlays only where needed to support legibility over the hero footage.
- Don’t apply the display face to schedules, tabs, logistics, or other functional information.
