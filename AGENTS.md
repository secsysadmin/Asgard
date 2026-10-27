<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Coding rules

Rules, not preferences. Each one is a defect in review. They mirror the rules used in Delphi
and the sechat bot; when in doubt, mirror the existing code that already follows them.

**Comments**
- Zero comments: no JSDoc, no banner or section-divider comments, no narration inside
  functions, no commented-out code, no TODOs. Code explains itself through names and small
  functions. If a line seems to need a comment, rename the constant or extract a function with
  a descriptive name, then delete the comment.
- The only exception is one line for a genuinely non-obvious external quirk that code cannot
  express: a browser or API limitation, or a security invariant (SVG sanitizing, the
  same-origin check, a security header). Keep these rare; every one is a deletion candidate
  in review.
- `// eslint-disable`, `/// <reference`, and the `"use client"` / `"use server"` pragmas are
  directives, not comments.

**Types and shape**
- Strict TypeScript, no `any`. No type assertions or non-null assertions except at a typed
  boundary (request bodies, Neon rows, `fetch` JSON, stored content before `normalizeContent`,
  DOM events and values): type the payload at the fields you read and keep loose shapes out of
  callers.
- Functions do one thing; extract instead of nesting. No long parameter lists; pass an object.
- No magic values. Thresholds, limits, lengths, delays, colors, and default copy are
  `SCREAMING_SNAKE_CASE` constants at module scope, or come from env with a named default.
  Module-level constants sit at the top of the file above the functions, never inside a
  function body.
- No IIFEs and no `typeof import("…")` type imports.
- In `.tsx`: props use a named type declared at the top of the file, not an inline annotation;
  React 19 refs go on that props type as `ref?: React.Ref<…>`, never `forwardRef`; no inline
  `style={{}}` where a class or stylesheet works (computed values passed as CSS variables are
  the exception).
- Match the surrounding file's naming and style when editing it.

**Reuse**
- Grep for the canonical example (an existing route, block renderer, or `lib/` helper) before
  writing pattern-shaped code, and mirror it exactly, defaults and quirks included.
- Shared logic lives in one place: studio route guards and responses (`lib/request.ts`,
  `lib/auth.ts`), content validation (`lib/content/normalize.ts`), rich-text and URL
  sanitizing (`lib/sanitize.ts`), upload validation (`lib/media.ts`), content paths
  (`lib/studio/paths.ts`), and block starters (`lib/content/blocks.ts`).
- Default to the durable option over the shortcut.

**Errors and replies**
- Never `catch {}` into silence. A catch returns a typed value the caller acts on, rethrows,
  or logs and produces a user-visible message.
- Every route and UI path ends in something the user sees. A database, upload, or network
  failure is a visible message in the studio, never a dropped request or a spinner that never
  stops.
- Only our own validation messages reach users; database and driver errors are logged and
  replaced with a plain message (`serverError`).
- Logs go through `console.error` / `console.warn` for failures with the identifying context
  in the message. No `console.log` in `app/`, `components/`, or `lib/`. Never log secrets,
  connection strings, or full payloads.

**Non-negotiables (easy to violate, always checked)**
- Access control is code. Every studio API route checks `sameOrigin` (for mutations) and
  `isAuthorized` before touching data, and `/admin` gates on `isAuthorized`.
- Every save goes through `normalizeContent`, and every rich-text field and link URL through
  `lib/sanitize.ts`, before it is stored or rendered. Uploads are validated by their real
  bytes in `validateUpload`; unsafe SVGs are refused and served sandboxed.
- Nothing that reads `DATABASE_URL` runs at import time, because `next build` imports every
  route. The database is reached on first use, never at module scope.
- No database keeps the public site working: `getPublishedContent` falls back to
  `defaultContent` and never throws.
- Production and previews stay isolated through `deploymentSchema()`; every query is scoped to
  it. `lib/database.ts`, `scripts/migrate.mjs`, and `schema.sql` stay in sync.

**Scope and verification**
- Change only what the task needs: no cosmetic cleanups in touched files, no repo-wide
  refactors to make verification pass.
- `npm run typecheck`, `npm run lint`, and `npm run build` before finishing. Run checks
  through the package scripts, never one-off substitutes, and never `echo` a success marker.
  A pre-existing failure you did not cause gets raised, not worked around.
- A failing check gets its cause fixed: never skip it, loosen it, or special-case around it.
- UI changes are checked in a browser at desktop and phone widths. Every hand-off includes
  the local steps to verify it.
- Before every push, a code-reviewer subagent reviews the diff for dead code, rule violations
  and edge cases. Read the whole batch of findings, group them by root cause, and fix each
  cause once.
- Never commit or push without an explicit instruction. Single-line conventional-commit
  messages (`feat:`, `fix:`, `perf:`, `chore:`, `refactor:`, `docs:`, `test:`), lowercase after
  the colon, aiming under 50 chars, saying what changed (not why), no ticket ids, no body, no
  trailing period.
- Worktrees live at `.claude/worktrees/<name>` (gitignored).
- "Reset" or "clean" tooling replays the flow; it never deletes data.

# Audit rubric (flag these)

Each is a defect to fix, not a preference:

1. Any comment beyond the single-line external-quirk exception: banners, narration, JSDoc.
2. Commented-out code or TODOs.
3. `any`, type assertions, or non-null assertions outside a typed boundary.
4. Functions or components doing several things, deep nesting, long parameter lists.
5. Duplicated logic (route guards, fetch handling, path updates, filename cleaning, menus).
6. Magic numbers or meaningful bare string literals (limits, delays, sizes, cache lifetimes).
7. Swallowed errors, or a failure path that does not end in a user-visible message.
8. Dead code, unused exports/imports/params, env vars in `.env.example` nothing reads.
9. A studio route missing its `isAuthorized` / same-origin check.
10. `DATABASE_URL` or another secret read or validated at module top level.
11. Content stored or rendered without `normalizeContent` / the sanitizer.
12. Secrets or tokens in code, logs, comments, or committed files.
13. `console.log` in `app/`, `components/`, or `lib/`; module constants declared mid-file or
    inside functions; IIFEs; `typeof import()` types; inline `.tsx` props types, `forwardRef`,
    or avoidable inline styles.
