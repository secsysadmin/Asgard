---
name: SEC Engineering Career Fair
description: A confident editorial fair site for Aggie engineers and recruiters.
colors:
  maroon: "#500000"
  maroon-dark: "#330000"
  cream: "#f5f1e8"
  paper: "#fbfaf6"
  ink: "#192320"
  sand: "#e7d7c2"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(3rem, 8vw, 9.25rem)"
    fontWeight: 500
    lineHeight: 0.82
    letterSpacing: "-0.065em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
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

The public site balances campus ritual with the physical scale of a real recruiting event. It feels like a well-designed event program: bold type, big pauses, practical schedules, and a visible human hand. The admin surface shares the same seriousness but shifts into a quieter, operations-first utility mode.

## Colors

Maroon is the institutional anchor; warm sand carries gentle contrast and action emphasis. Cream and paper keep lengthy logistics readable.

## Typography

Display uses Playfair Display for a confident editorial voice. DM Sans handles reading, controls, and schedules; DM Mono identifies administrative and event metadata.

## Layout

Public pages use an 8vw desktop gutter and alternate expansive editorial moments with dense operational sections. Mobile reduces gutters to 24px and preserves the reading order. The admin area uses a persistent sidebar and two-column workspace that becomes one column on small screens.

## Elevation & Depth

Public surfaces are mostly flat; contrast and sectional changes create hierarchy. The admin uses restrained borders and one soft mobile navigation shadow only where overlap requires it.

## Shapes

Controls are modestly rounded (4px); panels use 8px. The site avoids decorative cards in favor of ruled lists, type, and whole-surface color blocks.

## Components

### Buttons

Primary buttons use maroon or warm-sand fills, direct action language, and a subtle arrow translation on hover.

### Navigation

The public navigation is compact and horizontal until mobile, where it becomes a simple stacked disclosure. Admin navigation prioritizes a dark operational rail with a strong active row.

### Signature Component

Tab groups are the core information architecture: compact selectors expose rich but scannable logistics beneath.

## Do's and Don'ts

- Do use a maroon, cream, ink, and warm-sand relationship; keep sand focused on moments of emphasis.
- Do use ruled lists for schedules, teams, and logistical information.
- Don’t use generic dashboard-card grids on the public site.
- Don’t use gradients or glass effects.
- Don’t add an eyebrow above primary display headings.
