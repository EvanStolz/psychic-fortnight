# CRX Sniffer

Vets browser extension requests for small IT teams. Paste a Chrome Web Store, Edge Add-ons or Firefox Add-ons link
(or open a `.crx`, `.zip` or `.xpi` file) and get a verdict, Approve, Review or Deny, with the math behind it.
Approve or deny it, keep the list in your browser, and export a policy file for Chrome, Edge or Firefox.

## How it scores

Four axes, each with points and a tier: Capability (permissions and site reach), Code (what the scripts do, read as
syntax trees, plus bundled libraries with known flaws from retire.js), Reputation (the Malicious Extension Sentry list
and the publisher's contact details) and Change (coming later). Hard fails deny outright: known malware, updates from
outside the store, running downloaded code, stripping page security headers, obfuscated code that talks to the
network, and a CRX signature that fails. Store ratings, user counts and badges are shown but never score. A check that
could not run sends the verdict to Review; it never counts as a pass. The full rules are on the Method page and in
`src/lib/engine/rules.ts`.

## Privacy

- Store lookups are cached by the CDN per store, ID and version. The server keeps no database.
- Your list of approved and denied extensions lives only in your browser and in files you save.
- Uploaded files are analysed in your browser and never sent anywhere.

## Layout

| Path | What it holds |
| --- | --- |
| `src/lib/engine/` | The analysis: CRX signatures, safe unzip, manifest, code, libraries, lists, listing parsers, verdict. Pure TypeScript that runs on the server and in the browser. |
| `src/lib/server/` | Store downloads, version lookups and the two data feeds. |
| `src/app/api/` | `check` (link to current version), `analysis/{store}/{id}/{version}` (cached report), `listing/{store}/{id}`. |
| `src/lib/ui/`, `src/components/` | The Check, List, Export and Method pages. |

## Develop

```bash
npm install
npm run dev
```

Before a commit, `npm run typecheck`, `npm run lint` and `npm test` must pass. `npm run test:live` downloads real
extensions from all three stores to check the integration end to end.

Research and design rationale: `docs/research/reports/Browser extension vetting approaches.md`.
