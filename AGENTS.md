# CRX Sniffer

Vetting tool for browser extension requests (Chrome, Edge, Firefox) for small IT teams.
Research and design rationale: `docs/research/reports/Browser extension vetting approaches.md`.

## Next.js

This is Next.js 16. APIs and conventions differ from older versions. Before writing Next.js code, read the
relevant guide in `node_modules/next/dist/docs/` and follow its deprecation notices.

## Product rules

- Free to run on Vercel Hobby. No database and no Blob in Phase 1: Hobby resources lock for 30 days when a
  limit is passed. Results are cached by the CDN, keyed by store, ID and version.
- The server never stores which organisation approved which extension. Approval lists live in the browser
  and in files the user exports.
- Never log extension IDs together with client IP addresses.
- Store ratings, user counts and badges are context, never points.
- A check that could not run is shown as "not analysed" and routes to Review. It never scores 0.

## Code

- `src/lib/engine/` is pure TypeScript that runs on the server and in the browser. No Node-only imports there.
- Strict TypeScript, no `any`. Every engine module has unit tests next to it (`*.test.ts`).
- `npm run typecheck`, `npm run lint` and `npm test` must pass before a commit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
