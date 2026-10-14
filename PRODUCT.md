# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: Next.js was selected for a Vercel-native public site and an eventual Neon-backed administrative CMS.

## Users

Texas A&M engineering students preparing for the SEC Engineering Career Fair; company recruiters planning attendance and candidate outreach; SEC administrators maintaining fair content.

## Product Purpose

Present practical, current fair information for students and recruiters, while providing an approachable administrative foundation for editing page content, photography, navigation, and page layout.

## Positioning

A student-run engineering career fair experience that puts student and recruiter logistics on one focused, editorial site rather than splitting them into disconnected microsites.

## Operating Context

The 2026 fair is September 9–10 at Legends Event Center, with a virtual fair on September 11 through HireAggies. Admin updates will eventually deploy through Vercel and persist in Neon Postgres.

## Capabilities and Constraints

The public site requires student and recruiter tab groups, team, and contact information. The admin surface supports in-browser section reordering, visibility, content-field editing, and image previewing. Authentication, cloud upload, and Neon persistence remain integration work rather than fabricated functionality.

## Brand Commitments

Texas A&M maroon and the SEC home site are binding visual references. The experience should feel serious, warm, student-led, and engineering-forward.

## Evidence on Hand

Content and dates are adapted from the live 2026 SEC Career Fair website. The hero is an AI-generated, explicitly temporary placeholder image at `public/images/career-fair-hero.png`.

## Product Principles

- Make fair-day actions easy to find in seconds.
- Treat student and recruiter paths as equally first-class.
- Let a student-run operation feel polished and well-organized.
- Keep editing models structured so the CMS can grow without a frontend rewrite.
