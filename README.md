# CRX Sniffer

Vets browser extension requests for small IT teams. Paste a Chrome Web Store, Edge Add-ons or Firefox Add-ons link
(or open a `.crx`, `.zip` or `.xpi` file) and see what it can reach and what its code does, with the math behind it.
Add the extensions you use to a library kept in your browser, and save it as CSV, TXT, JSON or Markdown.

## How it scores

Four axes, each with points and a tier: Capability (permissions and site reach), Code (what the scripts do, read as
syntax trees, plus bundled libraries with known flaws from retire.js), Reputation (the Malicious Extension Sentry list
and the publisher's contact details) and Change (coming later). Hard fails are flagged in red whatever the points say: known malware, updates from
outside the store, running downloaded code, stripping page security headers, obfuscated code that talks to the
network, and a CRX signature that fails. Store ratings, user counts and badges are shown but never score. A check that
could not run is shown as not analysed; it never counts as a pass. The full rules are on the Method page and in
`src/lib/engine/rules.ts`.

## Privacy

- Store lookups are cached by the CDN per store, ID and version. The server keeps no database.
- Your library lives only in your browser and in files you save. Turn off "Remember in this browser" and nothing is
  stored at all.
- Uploaded files are analysed in your browser and never sent anywhere.

## Layout

| Path | What it holds |
| --- | --- |
| `src/lib/engine/` | The analysis: CRX signatures, safe unzip, manifest, code, libraries, lists, listing parsers, verdict. Pure TypeScript that runs on the server and in the browser. |
| `src/lib/server/` | Store downloads, version lookups and the two data feeds. |
| `src/app/api/` | `check` (link to current version), `analysis/{store}/{id}/{version}` (cached report), `listing/{store}/{id}`. |
| `src/lib/ui/`, `src/components/` | The Check, Library and Method pages. |

## Develop

```bash
npm install
npm run dev
```

Before a commit, `npm run typecheck`, `npm run lint` and `npm test` must pass. `npm run test:live` downloads real
extensions from all three stores to check the integration end to end.

Research and design rationale: `docs/research/reports/Browser extension vetting approaches.md`.
