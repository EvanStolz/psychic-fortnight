# Existing tools market: browser extension vetting, scoring and governance (as of Oct 2026)

Scope note: research run 2026-10-29. Most sources are vendor pages, press releases and third-party aggregators. Pricing for most commercial tools is not published; aggregator figures are flagged as such. Reddit (r/sysadmin, r/msp) threads could not be retrieved by the search tools used, so practitioner evidence is thinner than intended (see Gaps).

## Q1. Competitor map: what each tool does, target size, pricing, API, data sources, 2026 status

### Takeaway
The market consolidated hard in 2026: the venture-backed extension/browser-security startups were bought by large platform vendors (Koi by Palo Alto Networks, Seraphic by CrowdStrike, SquareX by Zscaler, LayerX by Akamai, Secure Annex by Socket), and CRXcavator, the only free, no-account, API-first extension risk scorer, has been dead since about 2023-2024. What remains for small teams is (a) free single-extension lookups (Spin.AI free tool, LayerX ExtensionPedia, Koidex, Am I Being Pwned, chrome-stats), (b) permission-based inventory inside suites they may already own (Chrome Enterprise Core, Defender Vulnerability Management, CrowdStrike Falcon Exposure Management, Tanium), and (c) enterprise platforms with sales-led pricing.

### Cited Findings

**Status overview table (summary of the findings below)**

| Tool | Type | Target | Price signal | API | 2026 status |
|---|---|---|---|---|---|
| CRXcavator (Duo) | Free risk scorer + inventory | Anyone | Was free | Was public | Dead (~2023-24) |
| Spin.AI free tool / SpinCRX / SpinOne | Risk scoring, inventory, policy | Mid-market (200-10,000 users) | Free tool; paid tiers unpublished | Unclear | Active; risk scores in Chrome admin |
| ExtensionTotal / Koidex (Koi) | Lookup + enterprise governance | Individuals free; enterprise paid | Free individual use | Yes (rate-limited) | Koi acquired by Palo Alto Networks (Feb 2026) |
| Secure Annex | Extension monitoring + API | Security teams | Unpublished | Yes | Acquired by Socket (Apr 2026) |
| LayerX / ExtensionPedia | Browser security extension + free database | Enterprise, many SMB reviewers | Per user/yr, unpublished; free audit | No public API found | Acquired by Akamai (closed Jul 2026) |
| Island | Enterprise browser | Enterprise | Very high (aggregator figures) | n/a | Independent |
| Chrome Enterprise Core / Premium | Browser management | All sizes | Core free; Premium ~$6/user/mo | Admin APIs | Active; Spin.AI scores built in |
| Microsoft Defender VM | Inventory + permission risk | MS shops | Needs MDVM add-on/standalone | Yes | Active; Windows only |
| CrowdStrike Falcon Exposure Mgmt | Inventory + permission severity | Falcon customers | Module of Falcon | Falcon APIs | Active; Seraphic added |
| Push Security | Browser extension (identity/SaaS) | SMB to enterprise | First 10 users free, ~$5/user/mo (aggregators) | Yes (not verified) | Independent |
| SquareX | Browser detection & response extension | Enterprise | Unpublished | n/a | Acquired by Zscaler (Feb 2026) |
| Seraphic | Browser runtime security | Enterprise | Unpublished | n/a | Acquired by CrowdStrike (Jan 2026 announced) |
| Prisma Access Browser (ex-Talon) | Enterprise browser/extension | Enterprise, SMB SKU reported | SMB ~$99/user/yr (unverified) | n/a | Active |
| Menlo Browser Posture Manager | Extension allow/block + risk score | Enterprise | Unpublished | n/a | Active |
| Obsidian Security extension | Shadow SaaS/AI, phishing | Mid-sized enterprises | Unpublished | n/a | Active |
| Tanium | Endpoint inventory + Enforce block | Enterprise | Unpublished | Yes | Active |
| Am I Being Pwned | Static + dynamic analysis, fleet plans | Security/IT teams | Free single scans; fleet by quote | REST API + webhooks | Active (new entrant) |
| Apify "Chrome Ext Security Analyzer" | Pay-per-scan manifest analysis | Developers | $0.20/extension | Apify API | Active (solo-dev tool) |
| Tarnish, ExtAnalysis (OSS) | Static analysis frameworks | Researchers | Free | Self-host | Unpolished / research-grade |

**CRXcavator (Duo Labs / Cisco) - shut down**
- Launched from Duo Labs in February 2019 as a free, no-account service that scanned the Chrome Web Store; score combined permissions, CSP and RetireJS (vulnerable JS libraries), with no normalization, weighting or ceiling, measuring risk surface rather than malicious intent; a companion "Gatherer" extension fed fleet inventory; public API spawned open-source clients and Splunk SOAR connectors — [Am I Being Pwned blog](https://amibeingpwned.com/blog/crxcavator-alternatives)
- Its data helped uncover 500+ malicious extensions affecting ~1.7M users in Feb 2020 — [Am I Being Pwned blog](https://amibeingpwned.com/blog/crxcavator-alternatives)
- Shutdown timing: "began failing in late 2023 and effectively gone by 2024", no shutdown notice found; stated reason is that the AWS account was switched off and the backend was never open-sourced — [Am I Being Pwned blog](https://amibeingpwned.com/blog/crxcavator-alternatives); another source says Cisco "quietly killed CRXcavator in 2023" — [DEV Community / NexGenData](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m). Spin.AI also states CRXcavator "is no longer in service" — [Spin.AI blog](https://spin.ai/blog/how-to-ensure-google-chrome-extensions-are-safe/). No official Duo/Cisco announcement found; both shutdown sources are vendors of competing tools.
- Original launch announcement on Cisco community: [Cisco Community, Feb 2019](https://community.cisco.com/t5/other-topics-duo-security/democratizing-chrome-extension-security-crxcavator-is-now/m-p/4884655/highlight/true); a CLI client (mrxcavator) still sits on PyPI but depends on the dead API — [PyPI](https://pypi.org/project/mrxcavator)

**Spin.AI (free risk assessment, SpinCRX, SpinOne)**
- Free tool for SaaS apps and browser extensions with daily-limited free assessments; SpinCRX is the paid enterprise product that discovers installed extensions, scores risk with AI and monitors new installs — [Spin.AI free assessment page](https://spin.ai/application-risk-assessment); [SpinCRX launch](https://spin.ai/news/spin-ai-launches-spincrx/)
- Partnership with Google (May 2023): Spin.AI risk scores surfaced in Chrome Browser Cloud Management; score out of 100 across 15+ factors — [Help Net Security](https://www.helpnetsecurity.com/2023/05/03/spin-ai-google/); Google says "third party provided risk scores by spin.AI are now easier to find directly in the Extension Usage Report" — [Google Cloud blog](https://cloud.google.com/blog/products/chrome-enterprise/boost-productivity-and-security-with-the-new-chrome-web-store-for-enterprises)
- Pricing: Spin.AI FAQ says pricing is structured for 200-10,000 users, per user, with tiers bundling backup, ransomware, SSPM, DSPM, DLP, "app + browser security" — [Spin.AI pricing FAQ](https://spin.ai/faq/pricing-roi/). Vendr data: $2,880-$59,140/yr, median $14,688/yr across 15 purchases (product mix not SpinCRX-specific) — [Vendr](https://www.vendr.com/marketplace/spin-ai). A competitor claims Spin.AI has a "$5,000/year minimum" — [DEV Community / NexGenData](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m) (unverified, competitor claim).
- Still publishing 2026 research ("AI Compliance and Browser Extension Risks in 2026") — [Spin.AI](https://spin.ai/ai-compliance-and-browser-extension-risks-in-2026/)

**ExtensionTotal / Koidex / Koi Security**
- ExtensionTotal began as a VS Code extension risk lookup (name/ID/URL -> malicious-risk assessment) — [Koi blog (archived title)](https://www.koi.ai/blog/4-6-introducing-extensiontotal-how-to-assess-risk-in-vs-code-extensions); API base `https://app.extensiontotal.com/api`, POST getExtensionRisk — [API Evangelist listing](https://apis.apievangelist.com/store/koi-security-risk-api/)
- Koidex is the successor: free for individual developers, covers VS Code, JetBrains, Chrome, Edge, Firefox, npm and more; behavior-based analysis; IDE extension free for personal use; free API rate limit then sponsor/API key; paid product is enterprise Koi platform — [Makerstack review](https://makerstack.co/reviews/koidex-review/); [Product Hunt](https://www.producthunt.com/products/koidex-2)
- Koi raised ~$48M (seed + $38M Series A, Sept 2025) — [Newswire](https://www.newswire.com/news/koi-raises-48m-to-reinvent-endpoint-security-for-the-modern-software-22637208)
- Palo Alto Networks announced a definitive agreement to acquire Koi on Feb 17, 2026 (~$400M reported); tech to be folded into Cortex XDR and Prisma AIRS; agentless "Agentic Endpoint Security" covering AI agents, browser extensions, VS Code plugins, MCP servers, model artifacts — [KuppingerCole](https://www.kuppingercole.com/blog/care/palo-alto-networks-acquires-koi-securing-the-agentic-endpoint); [SiliconANGLE](https://siliconangle.com/2026/01/04/palo-alto-networks-reportedly-explores-400m-acquisition-koi-security/)
- As of Oct 2026, Koi blog URLs (e.g., the "CISO's guide to using ExtensionTotal API" post) 301-redirect to `paloaltonetworks.com/cortex/agentic-endpoint-security` (observed directly when fetching koi.ai/blog/6-6-uncover-hidden-risks-cisos-guide-to-using-extensiontotal-api-for-your-organization). dex.koi.security still loads a "Koidex by Koi" shell, but content and terms could not be verified.

**Secure Annex**
- Monitors browser and editor (VS Code etc.) extensions: what's installed, what changes over time, what poses risk; founded by John Tuckner — [CIO Influence](https://cioinfluence.com/machine-learning/socket-acquires-secure-annex-to-expand-extension-security-across-browsers-and-developer-tools/)
- Has a public API (single API key gives access to all endpoints; manifest data, vulnerabilities, signatures) used by Tines and LimaCharlie integrations — [Tines docs](https://www.tines.com/docs/credentials/connect-flows/secure-annex); [LimaCharlie blog](https://limacharlie.io/blog/automating_browser_extension_security_lima_charlie_secure_annex). LimaCharlie says trying the add-on is free — [LimaCharlie docs](https://docs.limacharlie.io/docs/ext-secureannex)
- Acquired by Socket (announced April 28, 2026); Socket extending from open-source packages to extensions, MCP servers, AI skills — [CIO Influence](https://cioinfluence.com/machine-learning/socket-acquires-secure-annex-to-expand-extension-security-across-browsers-and-developer-tools/). Site now branded "Annex - Enterprise Software Extension Security & Management Platform" (page title observed); pricing page content not retrievable.

**LayerX / ExtensionPedia (now Akamai)**
- ExtensionPedia (May 2025): free public database of 200,000+ Chrome/Edge/Firefox extensions with unified risk score, permission scope, publisher reputation; scores derived from anonymised LayerX platform data; no API mentioned — [SecurityBrief Asia](https://securitybrief.asia/story/extensionpedia-launches-with-risk-scores-for-200k-browser-add-ons)
- Free "complimentary browser extension audit" (lead-gen) — [LayerX](https://layerxsecurity.com/complimentary-extensions-assessment/); paid platform priced per user per year, no published price; G2 says 56.5% of reviews from small businesses — [Capterra](https://www.capterra.com/p/10030549/LayerX-Security/); [G2](https://www.g2.com/compare/cloudflare-application-security-and-performance-vs-layerx-browser-security-platform)
- Akamai agreed to acquire LayerX for ~$205M cash (May 14, 2026), completed July 2, 2026; LayerX ARR expected ~$10M at year-end; brand to be retired "after a short period" — [SecurityWeek](https://www.securityweek.com/akamai-to-acquire-ai-and-browser-security-firm-layerx-for-205-million/); [Akamai press release](https://www.akamai.com/it/newsroom/press-release/akamai-completes-acquisition-of-secure-enterprise-browser-provider-layerx)
- LayerX 2026 report: 99% of enterprise users run at least one extension; 2025 report: 53% installed a high/critical-scope extension — [LayerX 2026 report](https://go.layerxsecurity.com/hubfs/Enterprise_Browser_Extension_Security_Report_2026.pdf); [LayerX 2025 report](https://go.layerxsecurity.com/hubfs/LayerX_Enterprise_Browser_Extension_Security_Report_2025.pdf) (vendor data)

**Island Enterprise Browser**
- No free tier, no published list price; aggregator/public-procurement figures vary wildly: UK G-Cloud listing $250,000/yr console + $200/user/yr; another source $11.38/user/mo (browser) and $5.20/user/mo (Island Extension); MSP deployments from ~$25,000/yr — [Venn](https://www.venn.com/learn/island-browser/island-browser-pricing/); [UK Digital Marketplace pricing doc](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-15/documents/584424/234060975999414-pricing-document-2026-01-22-1130.pdf). Figures conflict; treat as indicative of enterprise-only positioning.

**Chrome Enterprise Core / Premium**
- Core is free for all organizations; supports company-curated extension catalog in Chrome Web Store, block unvetted extensions, user extension-request workflow (allow/block/force-install) — [Google Cloud blog](https://cloud.google.com/blog/products/chrome-enterprise/boost-productivity-and-security-with-the-new-chrome-web-store-for-enterprises); [Chrome Enterprise Help: extension workflows](https://support.google.com/chrome/a/answer/10405494?hl=en)
- Requests only work when all extensions are blocked; allowlist must be prepared before blocking — [Secure Annex blog (snippet)](https://secureannex.com/blog/extension-request-workflows/)
- Risk scores in the Extension Usage Report come from Spin.AI; Chrome Web Store for Enterprise is free for Core and Premium — [TechRadar](https://www.techradar.com/pro/security/google-wants-to-give-it-admins-more-control-over-what-chrome-extensions-you-use-at-work)
- Premium ($6/user/month per Google pricing, as cited by an aggregator) added "advanced extension telemetry" (2026) and visibility into side-loaded extensions and extension-to-domain communications — [Venn (pricing)](https://www.venn.com/learn/island-browser/island-browser-pricing/); [Google Cloud blog](https://cloud.google.com/blog/products/chrome-enterprise/the-future-of-browser-based-security-leveraging-browser-data-for-proactive-defense)

**Microsoft Defender Vulnerability Management (MDVM)**
- Inventory of extensions in Edge, Chrome, Firefox: devices, users, on/off state, versions, requested permissions and "permissions risk" level; CSV export; APIs for per-device extension assessment and permission info; advanced hunting tables DeviceTvmBrowserExtensions / DeviceTvmBrowserExtensionsKB — [Microsoft Learn (updated Aug 2026)](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions)
- Windows devices only; requires MDVM Standalone or the MDVM add-on for Defender for Endpoint P2; Microsoft itself notes "Risk is subjective" — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions). A blog notes M365 Business Premium does not include it by default — [CIAOPS blog](https://blog.ciaops.com/tag/browser/)

**CrowdStrike Falcon Exposure Management**
- Browser extension inventory for Chrome, Edge, Safari, Firefox via Falcon agent; heuristic "permission severity" (e.g., intercept web traffic = critical); shows install method to flag sideloading; Falcon Fusion workflows; allow/block policies — [CrowdStrike product page](https://www.crowdstrike.com/en-us/platform/exposure-management/browser-extension-assessment/); [CrowdStrike blog](https://www.crowdstrike.com/en-us/blog/prevent-breaches-by-stopping-malicious-browser-extensions/)
- Blocked malicious extensions stay installed but disabled in Chrome/Edge; removed in Firefox — [University of Illinois IT](https://answers.illinois.edu/150192)

**Seraphic (now CrowdStrike)**
- CrowdStrike announced definitive agreement Jan 13, 2026; in-browser runtime controls in Chrome, Edge, Safari, Firefox and agentic browsers, managed and unmanaged devices; close expected Q1 FY27 — [CrowdStrike IR](https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-acquire-seraphic-turning-any-browser-secure). Price: ~$400M per one report vs "undisclosed" per Verdict — [Verdict](https://www.verdict.co.uk/newsletters/crowdstrike-acqusition-seraphic-security). Closing not confirmed in sources found.

**SquareX (now Zscaler)**
- Browser Detection and Response delivered as an extension; raised $20M Series A (Apr 2025); Zscaler completed acquisition Feb 5, 2026, undisclosed price — [Techzine](https://www.techzine.eu/news/security/138555/to-protect-browsers-as-the-digital-frontline-zscalers-buys-squarex); [SecurityWeek (funding)](https://www.securityweek.com/browser-security-firm-squarex-raises-20-million/amp/)

**Palo Alto Prisma Access Browser / Prisma Browser (ex-Talon)**
- Extension directory lists user-installed extensions; risk scored from permissions, review credibility and publisher reputation; low (1-2), medium (3), high (4-5); malicious extensions removed (browser) or disabled (extension form) — [Palo Alto docs](https://docs.paloaltonetworks.com/prisma-access-browser/administration/manage-prisma-access-browser-extensions); [Venn](https://www.venn.com/learn/browser-security/prisma-browser/)
- No public list price; one source reports an SMB SKU at $99/user/yr or $10/user/mo (conflicting) — [Venn (Island pricing article)](https://www.venn.com/learn/island-browser/island-browser-pricing/); [Airframe analysis](https://www.airframe.ai/product/prisma-access-browser/analysis)

**Push Security**
- Browser extension deployed via MDM/browser policy; extension inventory, permissions audit, allowlisting/blocking advertised — [Push Security](https://pushsecurity.com/lp/swg)
- Aggregators: first 10 employees free forever; $5/employee/month annual ($6 monthly); enterprise pricing for 2,000+ — [Capterra IE](https://www.capterra.ie/software/1035510/push-security); [Slashdot](https://slashdot.org/software/p/Push-Security). Not confirmed on Push's own pages; unclear if free tier includes extension features.

**Menlo Security** - Browser Posture Manager: allow/block/force-install extensions, view extension risk score — [Menlo datasheet](https://info.menlosecurity.com/rs/281-OWV-899/images/Menlo-Security-Browser-Posture-Manager-DS.pdf)

**Obsidian Security** - Browser extension launched May 2025 for mid-sized enterprises: shadow SaaS / shadow GenAI discovery, identity-threat (token phishing) prevention; local analysis; Chrome, Edge, Firefox — [Help Net Security](https://www.helpnetsecurity.com/2025/05/14/obsidian-security-browser-extension/); [BusinessWire](https://www.businesswire.com/news/home/20250514550295/en). Not primarily an extension vetting tool.

**Tanium** - Converge 2026 lab: fleet-wide extension inventory (incl. AI extensions), then Tanium Enforce to block/remove — [Tanium Converge 2026](https://converge.tanium.com/2026/session/4038756/know-the-terrain-from-indicators-to-outcome-with-guardian-atlas-and-threat-response)

**Cyberhaven** - Relevant mainly as a cautionary case: Dec 2024 phished developer account pushed malicious update to Cyberhaven's own security extension (~400,000 users), removed ~1 hour after detection — [Spin.AI blog](https://spin.ai/blog/risks-of-browser-extensions-cyberhavens-breach/). Shows that "trusted, approved" extensions can turn malicious via update, so one-time approval is insufficient.

**New / small entrants**
- Am I Being Pwned: free single-extension scans (no account), static + dynamic analysis with researcher review, blocklists via Google Workspace/MDM/SentinelOne, REST API + webhooks; fleet pricing by contact form — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives)
- NexGenData "Chrome Extension Security Analyzer" on Apify: $0.20/extension, downloads CRX from Google update servers, parses CRX3 + manifest (permissions, host permissions, content scripts, CSP) — [DEV Community](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m); [Apify](https://apify.com/nexgendata/chrome-extension-security-analyzer)
- extensionauditor.com and extscope.org publish per-extension scan pages (e.g., permission tiers) — [Extension Auditor scan example](https://extensionauditor.com/scan/extension-guard-manage-and-secure-extensions-ehfbeifiabejfkjhbghkgnnaccfmelkb); [ExtScope](https://www.extscope.org/extension/gjfdlpdedlbiokokikmhjcelbkaljbep). Pricing/ownership not retrievable (403).
- crxaminer (GitHub) open-source scanner — [GitHub markkcc/crxaminer](https://github.com/markkcc/crxaminer) (not reviewed in detail)

**Open-source analysis tools**
- Tarnish: MIT-licensed Chrome extension static analysis (web_accessible_resources clickjacking detection, fingerprinting JS); "un-polished"; self-hosting needs AWS t2.medium+ workers; hosted at thehackerblog.com/tarnish — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fmandatoryprogrammer%2Ftarnish); [Kali Linux Tutorials](https://kalilinuxtutorials.com/tarnish-chrome-extension-static-analysis/amp/)
- ExtAnalysis: Python framework scanning Chrome, Firefox, Brave extensions for vulnerabilities and intel, ~670 stars, Docker support, GPL-3.0 — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2FTuhinshubhra%2FExtAnalysis)

### Inferences
- Every well-funded independent extension-risk vendor of 2024-2025 has been absorbed into a platform (PANW, CrowdStrike, Zscaler, Akamai, Socket). Their roadmaps will now favour existing enterprise customers of those platforms, which plausibly widens the gap for SMBs that don't buy those suites. This is also evidence the problem is valued (several $200-400M exits), but that the standalone category is hard to sustain independently.
- The tools SMBs may already own (Chrome Enterprise Core, MDVM, Falcon) score mostly on declared permissions. None found offers explainable, code-level "why" for a single extension in a form a non-specialist IT admin can act on.
- The free lookups (Spin.AI free, ExtensionPedia, Koidex) are lead-generation funnels for enterprise products; their longevity post-acquisition is uncertain (Koi blog already redirects to PANW).

### Gaps
- No official public pricing found for SpinCRX, Secure Annex/Annex, LayerX, Island, Prisma Browser, Menlo, Seraphic, SquareX, Koi enterprise.
- Not researched in depth / no sources retrieved: Code42 Incydr (extension-related exfiltration detection), Torq (SOAR workflows for extensions), Cyberhaven's current product features in 2026.
- Whether Koidex free lookups and the ExtensionTotal API still operate post-PANW acquisition could not be confirmed (page only rendered "Loading...").
- Whether Seraphic and Koi deals have formally closed was not confirmed.
- chrome-stats.com's own pricing page returned 403; only a third-party listing ($3.50/mo Personal, $15/mo Developer) was found, possibly outdated — [AlternativeTo](https://alternativeto.net/software/chromestats/about).

## Q2. Free or low-cost data sources and APIs an app could reuse

### Takeaway
A solo developer can assemble a credible pipeline from: Google's unofficial CRX update endpoint (code + manifest), Mozilla's documented AMO API (metadata, permissions, file URL), public malicious-ID lists on GitHub (MalExt / malicious_extension_sentry, ~7,000 IDs), abuse.ch (free key) for domain/URL reputation, and possibly chrome-stats for store metadata history. The main constraints are that Google and Microsoft have no official public read API for their stores, and VirusTotal's free API forbids commercial use.

### Cited Findings
- **Google CRX download endpoint**: `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=<ver>&acceptformat=crx2,crx3&x=id%3D<ID>%26uc` widely used; examples set a large prodversion due to `minimum_chrome_version` — [Paul Irish gist](https://gist.github.com/paulirish/78d6c1406c901be02c2d). Reports of the minimal form failing for newer extensions and of changed behaviour — [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/1153553/how-can-i-download-a-crx-using-clients2-google-com); [Stack Overflow mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/24131170/troubleshoot-google-api-to-download-crx-from-webstore). Not documented by Google as a supported API; the official docs only describe the update-manifest format for self-hosted extensions — [Chrome developers: Linux hosting](https://developer.chrome.com/docs/extensions/mv3/linux_hosting). CRX3 has a protobuf header before the ZIP payload — [DEV Community](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m)
- **Mozilla AMO API (v5)**: documented endpoints for addon detail (`/api/v5/addons/addon/{id|slug|guid}/`), search, versions; version `file` object has `url`, `hash`, `size`, and `permissions`, `optional_permissions`, `host_permissions`, `data_collection_permissions`; v5 "can change at any time without warning", v4 is frozen; public reads need no auth; rate limits not stated in the page — [AMO API docs](https://mozilla.github.io/addons-server/topics/api/addons.html)
- **chrome-stats.com**: covers Chrome, Edge and Firefox add-ons, offers stats/insights and a paid subscription (launched with a malicious-extension-protection pitch) — [PR Newswire](https://www.prnewswire.com/news-releases/a-new-era-of-safety-how-chromestats-monthly-subscription-is-protecting-against-malicious-chrome-extensions-301385259.html); [chrome-stats about page](https://firefox-stats.com/about). Third-party listing: Personal $3.50/mo, Developer $15/mo (may be stale) — [AlternativeTo](https://alternativeto.net/software/chromestats/about). A user comment calls its API fees "quite low" compared with an Apify scraper — [Apify issue](https://apify.com/cyberfly/chrome-extensions/issues/overcharged-56FvXN7RTK9ree2cl) (anecdotal). Pricing page returned 403 to automated fetch.
- **VirusTotal Public API**: 500 requests/day, 4/minute; must not be used in commercial products or services; multiple accounts to evade limits prohibited — [Wazuh docs](https://documentation.wazuh.com/current/user-manual/capabilities/virustotal-scan/about.html); [IBM community](https://community.ibm.com/community/user/security/blogs/ben-williams1/2021/11/19/threat-feed-virustotal-changes)
- **abuse.ch (URLhaus, ThreatFox, MalwareBazaar)**: free account Auth-Key mandatory since June 30, 2025; one key covers all abuse.ch APIs; sent as `Auth-Key` HTTP header — [abuse.ch blog](https://abuse.ch/blog/community-first/); [Elastic forum](https://discuss.elastic.co/t/abuse-ch-api-key-required-but-no-option-in-integration/376165)
- **Public malicious-extension ID lists**:
  - MalExt Sentry (malext.io), MIT-licensed, ~6,989 extensions as of Oct 6, 2026, with ID, name, removal reason, source, date — [IT-Connect](https://www.it-connect.tech/malext-open-source-database-lists-nearly-7000-malicious-chrome-extensions/)
  - toborrm9/malicious_extension_sentry: auto-updated list of Chrome/Edge extensions removed from the store for malware/policy violations — [FeedBagel](https://feedbagel.com/post/github-repository-maintains-database-of-malicious-chrome-and-edge-extensions)
  - GitLab Threat Intelligence CSV (16 IDs) in SlimKQL hunting repo — [KQLSearch](https://kqlsearch.com/query/GitLab%20Threat%20Intelligence%20Identified%2016%20Malicious%20Chrome%20extensions&cm7ioushu00n0p10fky2wrt38)
  - mallorybowes/chrome-mal-ids (stale ~3 years) — [RelatedRepos](https://relatedrepos.com/gh/mallorybowes/chrome-mal-ids); Wladimir Palant's research lists — [palant.info](https://palant.info/2023/05/31/more-malicious-extensions-in-chrome-web-store)
  - Cyberhaven-campaign IOCs (2024 hijacked extensions) — [detections.ai](https://detections.ai/detections/0199f41c-f026-77ae-af18-e4fd589aab8b)
- **Secure Annex API** (paid/trial; now Socket) offers manifest, vulnerability and signature endpoints — [LimaCharlie blog](https://limacharlie.io/blog/automating_browser_extension_security_lima_charlie_secure_annex)
- **Koi/ExtensionTotal API**: free tier rate-limited, then key — [Makerstack](https://makerstack.co/reviews/koidex-review/) (post-acquisition status unknown)
- **Microsoft Defender APIs** (for customers who already own MDVM): export extension assessment per device and permission info — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions). Could be an import source for inventory in an SMB app.
- **Store vetting reliability**: 86% of infringing extensions are extremely similar to previously vetted items and take months/years to remove — [arXiv 2406.00374](https://arxiv.org/html/2406.00374v1); 346M users installed a "security-noteworthy" extension over three years (2020-2023 data) — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1); [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)

### Inferences
- Chrome Web Store item-page scraping is the only route to ratings, user counts, developer info and "featured/verified" badges for Chrome, unless paying chrome-stats. The Chrome Web Store has no documented public read API (the official Chrome Web Store API is for publishing). Scraping should be rate-limited and cached; check Google's Terms of Service before relying on it commercially.
- The Edge Add-ons store likewise appears to lack a public read API (the Microsoft Edge Add-ons API is a publishing API); this was not verified in this session.
- Because VirusTotal's free API cannot be used in a commercial product, a paid app would need VT Premium or should avoid VT; abuse.ch (free key) is the safer free reputation source for domains found in extension code.
- Combining the store "removed" signal (malicious_extension_sentry) with a user's inventory is a cheap, high-value feature: "you have N extensions Google has since pulled for malware."

### Gaps
- Google Chrome Web Store Terms of Service clauses on automated access were not retrieved; scraping legality/ToS risk is unverified.
- Edge Add-ons store: no source confirmed whether any public metadata endpoint exists.
- chrome-stats API rate limits, commercial terms and redistribution rights not confirmed.
- abuse.ch free-tier rate limits and formal terms not retrieved.
- AMO third-party usage policy and rate limits not retrieved.

## Q3. What SMB IT teams actually do today for extension approval; pain points

### Takeaway
The available evidence (Google docs, Jamf/admin forums, university IT policies, one HN comment) shows the default SMB practice is a manual allowlist: block all via Chrome policy / MDM, allow a short list of IDs, and handle user requests by ad hoc review (often reading the store page and permissions). Pain points are that the request workflow is clunky, allowlists end up "annoyingly small", there is no re-vetting when extensions update, and controls are weak unless browsers and devices are also managed. Direct Reddit evidence could not be retrieved.

### Cited Findings
- Chrome admin workflow: block all, maintain allowlist, let users request, then admin allows/blocks/force-installs from the Admin console; Google advises limiting requests to company-owned devices in a test OU at first — [Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10405494?hl=en)
- Requests only possible when all extensions are blocked; allowlist must be built first — [Secure Annex blog (snippet)](https://secureannex.com/blog/extension-request-workflows/)
- Mac admins: block wildcard `*` in ExtensionInstallBlacklist and list approved IDs in ExtensionInstallWhitelist via Jamf configuration profile — [Jamf Community](https://community.jamf.com/general-discussions-2/block-all-google-chrome-extensions-except-approved-ones-3319)
- University practice: NC State reviews Google add-ons because "it's virtually impossible to evaluate the institutional risk"; approvals last one year and must be resubmitted annually — [NC State DASA](https://intranet.dasa.ncsu.edu/howto/knowledge-base/how-do-i-get-a-google-addon-or-extension-approved)
- UC Berkeley guidance: be selective; be wary if an extension suddenly requests new permissions — [UC Berkeley Security](https://security.berkeley.edu/node/1777)
- CMU ISO had to push Chrome policies to block malicious extensions withdrawn from the store (because removal from the store doesn't remove existing installs) — [CMU ISO](https://www.cmu.edu/iso/news/2025/google-vulnerabilities.html)
- HN commenter (2023): employer limits extensions to an "annoyingly small" allowlist; vetting matters less unless the company also restricts browsers and requires managed devices, which is why many companies deprioritise it — [Hacker News](https://news.ycombinator.com/item?id=37355122)
- Manual analysis cost estimate: ~15-30 min per extension (download, unzip, read manifest) — [DEV Community / NexGenData](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m) (vendor-author estimate)
- M365 Business Premium SMB guidance: extension inventory/risk in Defender requires an add-on beyond Business Premium — [CIAOPS blog](https://blog.ciaops.com/tag/browser/)
- Push coverage caveat: "only as good as extension penetration across the fleet" — [CyberSecTools](https://cybersectools.com/tools/push-security-browser-extension)
- 2026 guidance reiterates: inventory extensions, then implement an allow-list policy — [NHI Mgmt Group FAQ](https://nhimg.org/faq/how-should-organizations-manage-browser-extension-risks/)

### Inferences
- The concrete unmet job for an SMB admin is: "a user asked for extension X; give me a defensible yes/no in a couple of minutes, record why, and tell me if it changes later." Chrome Admin gives the approve/block buttons and a Spin.AI number but no explanation, history, or re-review trigger.
- Annual re-approval (NC State) and post-update compromise (Cyberhaven) both point to continuous monitoring of approved extensions (new version, new permissions, ownership change, store removal) as a core need.
- MSPs managing many small tenants likely need multi-tenant allowlists and reusable verdicts; none of the cheap tools found offer this, though this is inferred, not evidenced.

### Gaps
- No r/sysadmin or r/msp threads were retrievable via the search tools; practitioner sentiment, common workarounds (e.g., spreadsheets, ticket templates) and willingness-to-pay remain unverified. Recommend manual review of Reddit threads such as searches for "chrome extension allowlist" on r/sysadmin and r/msp.
- No survey data found on what share of SMBs enforce any extension policy.

## Q4. Gaps in existing tools: price, enterprise-only, agents/enterprise browsers, explainability

### Takeaway
There is a clear gap between free single-extension lookups (opaque scores, lead-gen, uncertain longevity) and enterprise platforms (sales-led, $10k+/yr, require agents, a proprietary browser, or a security suite). An SMB-focused, agentless web app that explains a verdict from the code and manifest, tracks approved extensions for changes, and plugs into the free Chrome Enterprise Core / Intune allowlist is not well served, but it competes with "good enough" free permission scores and with large vendors that may push down-market.

### Cited Findings
- Enterprise price points: Island $250,000/yr console listing plus per-user fees — [UK Digital Marketplace](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-15/documents/584424/234060975999414-pricing-document-2026-01-22-1130.pdf); Spin.AI pricing structured for 200-10,000 users, Vendr median $14,688/yr — [Spin.AI FAQ](https://spin.ai/faq/pricing-roi/); [Vendr](https://www.vendr.com/marketplace/spin-ai); LayerX per user/yr, undisclosed, no free tier — [Capterra](https://www.capterra.com/p/10030549/LayerX-Security/)
- Suite/agent dependencies: MDVM needs Standalone or add-on to MDE P2 and is Windows-only — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions); CrowdStrike needs the Falcon agent + Exposure Management module — [CrowdStrike](https://www.crowdstrike.com/en-us/platform/exposure-management/browser-extension-assessment/); Prisma/Island require their browser or extension — [Palo Alto docs](https://docs.paloaltonetworks.com/prisma-access-browser/administration/manage-prisma-access-browser-extensions)
- Explainability limits: CRXcavator's score measured "risk surface rather than malicious intent", unweighted — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives); MDVM's risk is permission-based and "Risk is subjective" — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions); CrowdStrike uses a heuristic permission severity — [CrowdStrike blog](https://www.crowdstrike.com/en-us/blog/prevent-breaches-by-stopping-malicious-browser-extensions/); Prisma risk combines permissions, review credibility, publisher reputation into a 1-5 bucket — [Palo Alto docs](https://docs.paloaltonetworks.com/prisma-access-browser/administration/manage-prisma-access-browser-extensions); Spin.AI uses 15+ factors into a score out of 100 — [Help Net Security](https://www.helpnetsecurity.com/2023/05/03/spin-ai-google/)
- Behaviour/code-level analysis exists but in enterprise or new-entrant products: Koidex "analyzes what code actually does" — [Makerstack](https://makerstack.co/reviews/koidex-review/); Am I Being Pwned static + dynamic with researcher review — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives)
- Consolidation: Koi -> Palo Alto (Feb 2026) — [KuppingerCole](https://www.kuppingercole.com/blog/care/palo-alto-networks-acquires-koi-securing-the-agentic-endpoint); Seraphic -> CrowdStrike (Jan 2026) — [CrowdStrike IR](https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-acquire-seraphic-turning-any-browser-secure); SquareX -> Zscaler (Feb 2026) — [Techzine](https://www.techzine.eu/news/security/138555/to-protect-browsers-as-the-digital-frontline-zscalers-buys-squarex); LayerX -> Akamai (Jul 2026) — [Akamai](https://www.akamai.com/it/newsroom/press-release/akamai-completes-acquisition-of-secure-enterprise-browser-provider-layerx); Secure Annex -> Socket (Apr 2026) — [CIO Influence](https://cioinfluence.com/machine-learning/socket-acquires-secure-annex-to-expand-extension-security-across-browsers-and-developer-tools/)
- Low-cost competition already exists at the bottom: Push free for 10 users then ~$5/user/mo (aggregator) — [Capterra IE](https://www.capterra.ie/software/1035510/push-security); Apify analyzer $0.20/extension — [Apify](https://apify.com/nexgendata/chrome-extension-security-analyzer); Am I Being Pwned free scans — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives); Chrome Enterprise Core free with Spin.AI scores — [TechRadar](https://www.techradar.com/pro/security/google-wants-to-give-it-admins-more-control-over-what-chrome-extensions-you-use-at-work)

### Inferences
- Differentiation candidates for a solo-built SMB app (inferred from the gaps above):
  1. Explainable verdicts: show which permissions, host patterns, remote code / eval, external domains and libraries drive the score, with the evidence lines, instead of a single opaque number.
  2. Approval workflow as the product: request intake, decision record, expiry/re-review, export to Chrome policy JSON / Intune / Jamf allowlist. Existing free tools score; they don't manage the decision.
  3. Change watch on approved extensions: new version diff, new permissions, ownership/publisher change, store takedown (MalExt/removed lists), which addresses the Cyberhaven-type update attack.
  4. Agentless and browser-agnostic: works from extension IDs or a Chrome/Edge/Intune export, no agent or enterprise browser.
  5. Flat, published SMB/MSP pricing (multi-tenant for MSPs), contrasting with sales-led enterprise pricing.
- Risks: Google could improve explainability in free Chrome Enterprise Core; acquired vendors may launch free tiers; free lookups (Spin.AI, ExtensionPedia, Koidex) set a "free" price anchor for single-extension scoring. Value must come from workflow + monitoring, not from the score alone.
- A CRXcavator-style free public lookup could be a strong acquisition channel, since CRXcavator's absence is still being written about in 2026 (multiple "CRXcavator is dead" posts) — [The Next Gen Nexus](https://thenextgennexus.com/2026/05/14/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026/).

### Gaps
- No direct evidence of SMB willingness-to-pay or budget for extension vetting.
- No independent (non-vendor) comparison of scoring accuracy across tools.
- Unknown whether Google plans richer explainability in Chrome Enterprise Core.
