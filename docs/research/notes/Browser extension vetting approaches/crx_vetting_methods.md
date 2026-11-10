# Technical methods for vetting browser extension packages (CRX, Edge, XPI)

Research date: 2026-10-29. Scope: what a veteran security engineer checks in an extension package, which tools exist, and what is feasible in a serverless Next.js/TypeScript app on Vercel versus a heavier sandbox. About 25 searches and fetches. Primary sources are preferred; vendor and aggregator claims are flagged.

## 1. Obtaining the package (CRX download endpoints, Edge, Firefox, CRX3 format, versions)

### Takeaway
Chrome and Edge packages come from undocumented but widely used update-service endpoints that return the current version only. CRX3 is a protobuf header (signed proofs) followed by a plain zip, so it can be parsed and verified in pure TypeScript. Firefox has a documented public API, but this session could not reconfirm its exact URL pattern. Historic versions are not served by the stores, so version history has to be built by archiving each fetch yourself.

### Cited Findings
- Chrome endpoint pattern used by scripts: `https://clients2.google.com/service/update2/crx?prodversion=<chrome version>&acceptformat=crx2,crx3&x=id%3D<ID>%26installsource%3Dondemand%26uc`. This comes from a third-party PowerShell module, not Google documentation. [PowerShell Gallery Get-CRXUpdateUrl.ps1](https://powershellgallery.com/packages/CRX/0.2.0/Content/Private/Get-CRXUpdateUrl.ps1)
- Google's old self-hosting docs name `https://clients2.google.com/service/update2/crx` as the update URL that "points to your extension's crx in the Chrome Web Store". [Chrome docs, archived 2014](https://bakpao.comeasyouare.workers.dev/minatozaki-https-web.archive.org/web/20141110141343/https://developer.chrome.com/extensions/external_extensions)
- clients2.google.com redirects to clients2.googleusercontent.com for the file itself. Google says update hostnames can change without notice. [Chromium extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/viHs4WYUrQQ)
- Reliability reports conflict. A 2023 Microsoft Q&A thread says the endpoint "doesn't seem to be working like it used to", and a forum post claims Google blocks automated downloads. Other tools still list it as supported. None of these is an official statement. [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/1153553/how-can-i-download-a-crx-using-clients2-google-com); [Latenode community](https://community.latenode.com/t/google-chrome-extension-download-api-not-working-need-help-debugging/38917)
- Chromium's own downloader code (`extension_downloader.cc`) is the authoritative reference for current request parameters. [Chromium source](https://chromium.googlesource.com/chromium/src.git/+/main/extensions/browser/updater/extension_downloader.cc)
- Edge: Microsoft documents the Edge Add-ons update URL (`edge.microsoft.com/extensionwebstorebase/v1/crx`) as the `update_url` for store-hosted extensions. A user-reported (2021) download form adds `response=redirect` and `x=id%3D<ID>...`. Microsoft does not document direct download. [Microsoft Learn: alternate distribution](https://learn.microsoft.com/en-gb/microsoft-edge/extensions-chromium/developer-guide/alternate-distribution-options); [Tech Community thread](https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/is-it-possible-to-download-the-crx-file-for-chromium-based-edge-extension-simila/1042149/replies/2029911)
- The npm package `crx-util` downloads CRX files by ID for Chrome and Edge, and parses them. [npm crx-util](https://npmjs.com/package/crx-util)
- CRX3 format (Chromium `crx3.proto`): magic "Cr24", version 3, header length, then a protobuf `CrxFileHeader` holding repeated `AsymmetricKeyProof` entries.
  - Each proof is an RSA key with a PKCS#1 v2.1 PSS signature or an ECDSA P-256 key, and the public key is an X.509 SubjectPublicKeyInfo block.
  - `signed_header_data` carries the `crx_id`, the first 128 bits of the SHA-256 of the developer public key.
  - The signed bytes are "CRX3 SignedData\x00", then the header size, then `signed_header_data`, then the zip archive. [Chromium crx3.proto](https://chromium.googlesource.com/chromium/src/+/e9b1018/components/crx_file/crx3.proto); [jsDelivr copy of crx3.proto](https://cdn.jsdelivr.net/npm/crx3@2.0.0/lib/crx3.proto)
- `crx_verifier.h` exposes `Verify()` with formats CRX3, CRX3_WITH_TEST_PUBLISHER_PROOF and CRX3_WITH_PUBLISHER_PROOF. Web Store packages also carry a Google publisher proof. Results include signature-mismatch and malformed-key errors, and the parser caps header size. [Chromium crx_verifier.h](https://chromium.googlesource.com/chromium/src/+/HEAD/components/crx_file/crx_verifier.h); [crx_verifier.cc](https://chromium.googlesource.com/chromium/src/+/e9b1018/components/crx_file/crx_verifier.cc)

### Inferences
- **Parsing and verifying CRX3 on Vercel works.** Read the magic and the length, decode the header with protobufjs, and verify each proof with WebCrypto (`RSA-PSS`/SHA-256 and `ECDSA` P-256). Then check that `crx_id` equals the SHA-256 prefix of a developer key, mapped to the a–p alphabet to get the extension ID. Then unzip with JSZip or fflate. All of this is pure JS and fits a serverless function.
- **Checking the publisher proof needs Google's key.** That public key is hard-coded in Chromium, so a full check means copying it from Chromium source.
- **Version handling.** The update endpoint returns only the current version, and its response headers or the manifest give the version. Anyone who wants diffs must store every package they see (for example in Vercel Blob or S3), keyed by ID, version and SHA-256.
- **Store the hash before extracting.** Treat archives as hostile: limit zip-bomb size and file count, and reject path traversal entries.
- **Firefox AMO.** The public API (v5) is believed to list versions with a file URL, hash and permissions. The XPI is a plain zip with Mozilla signatures (META-INF/ COSE or PKCS7). Not verified this session.

### Gaps
- The Firefox AMO v5 API endpoints could not be confirmed: the docs URL tried returned 404.
- There is no official Google documentation of `prodversion`/`acceptformat`. Current rate limits and any blocking of automated downloads from cloud IP ranges are unknown and should be tested empirically from Vercel egress.
- The Chrome Web Store offers no official way to fetch historic versions. Third-party archives that may hold them (for example CRX mirrors) were not researched.

## 2. Static analysis checklist (manifest, code, endpoints, libraries, SDKs)

### Takeaway
Static checks fall into three layers.
1. **Manifest capability:** permissions, host access, content-script reach, external messaging, CSP and `update_url`.
2. **Code behaviour:** dynamic code execution, remote-config-driven DOM/HTML injection, `declarativeNetRequest` header stripping, exfiltration-shaped `fetch` calls, and anti-analysis code.
3. **Composition:** vulnerable libraries via retire.js, endpoints and domains, and SDKs.

Chrome's own install warnings understate risk. `cookies`, `scripting` and `webRequest` show no warning on their own.

### Cited Findings
- **Chrome install warnings.** The official permissions list gives these warnings:
  - `debugger`: "Access the page debugger backend" and "Read and change all your data on all websites"
  - `proxy`, `pageCapture`, `tabCapture`, `webAuthenticationProxy`: "Read and change all your data on all websites"
  - `history`: "Read and change your browsing history on all signed-in devices"
  - `tabs`, `webNavigation`, `declarativeNetRequestFeedback`: "Read your browsing history"
  - `clipboardRead`: "Read data you copy and paste"
  - `management`: "Manage your apps, extensions, and themes"
  - `nativeMessaging`: "Communicate with cooperating native applications"
  - `declarativeNetRequest`: "Block content on any page"
  - `privacy`, `contentSettings`, `desktopCapture`, `geolocation`, `downloads` and `identity.email` also warn.

  The same page lists **no warning** for `cookies`, `scripting`, `webRequest`, `webRequestBlocking`, `identity`, `browsingData`, `declarativeNetRequestWithHostAccess`, `offscreen`, `userScripts` (which needs the user to enable it) and `storage`. Their real power depends on host permissions. [Chrome permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- **MV3 remote-code rule.** Remotely hosted code means "anything that is executed by the browser that is loaded from someplace other than the extension's own files" (JS and WASM; JSON and CSS are data). It is banned "regardless of where the code comes from", including library dependencies and dead code. `eval()` is unsupported by default.
  - Exceptions: sandboxed iframes, where the CSP blocking eval can be lifted; the User Scripts API (needs developer mode, for user script managers); and `chrome.debugger`, which can run code over the DevTools Protocol behind a persistent banner. [Chrome: remote hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- **How malicious MV3 extensions get around the remote-code ban** (Wladimir Palant, January 2025, 63 extensions):
  - remote config that returns HTML, injected unescaped into pages so it runs in page context
  - `window.eval.call(window, ...)` on remotely fetched script in page context
  - static `declarativeNetRequest` rules that strip `content-security-policy` and `x-frame-options` from every site
  - server-supplied arrays passed to `updateDynamicRules`
  - small bespoke interpreters that build elements from server-defined tag and attribute names
  - obfuscated instruction sets built from numerically keyed storage values
  - anti-debugging that clears traces when `chrome://extensions` is open (`tabs.query` for it)
  - `tabs.onUpdated` listeners that batch-send URLs
  - `tabs.create({active:false})` for pop-unders and `tabs.update` redirects

  Affected installs ranged from hundreds to 800,000 per extension (for example VPN Surf 800k, Adblock all advertisements 700k). [Palant: Malicious extensions circumvent Google's remote code ban](https://palant.info/2025/01/20/malicious-extensions-circumvent-googles-remote-code-ban/)
- **Remote configuration in active campaigns.** LayerX reports a 12+ extension MV3 cluster (over 130k users) that "used remote configuration to bypass store review", with malicious features added 6–12 months after first publication. Another 32-extension campaign could change behaviour by editing a hosted config file without a store resubmission. These are vendor reports via aggregator. [LayerX](https://layerxsecurity.com/?p=4717); [Dark Reading](https://darkreading.com/application-security/google-chrome-store-review-process-data-stealer)
- **Mozilla addons-linter rule names to reuse.** The linter publishes `NO_IMPLIED_EVAL` (eval-like methods) and `MANIFEST_CSP_UNSAFE_EVAL` ('unsafe-eval' in the CSP). A mirror also lists `DANGEROUS_EVAL` (eval and the Function constructor), which is unverified against the official page. Mozilla's `eslint-plugin-no-unsanitized` flags unsafe `innerHTML`/`outerHTML`/`insertAdjacentHTML` sinks. [addons-linter rules](https://mozilla.github.io/addons-linter/); [eslint-plugin-no-unsanitized](https://github.com/mozilla/eslint-plugin-no-unsanitized/blob/main/README.md?plain=1)
- **Mozilla reviewer stance.** Older AMO reviewer guidance said eval is generally prohibited with some exceptions. The page is marked work in progress. [Mozilla wiki](https://Wiki.Mozilla.org/AMO:Editors/EditorGuide/AddonReviews/Security)
- **retire.js** flags vulnerable JS libraries by URL, filename, file content or specific hash signatures, using `jsrepository.json`, which is refreshed daily. It ships as a CLI and as Burp/ZAP plugins. [burp-retire-js](https://www.github.com/h3xstream/burp-retire-js); [retire README](https://cdn.jsdelivr.net/npm/retire@5.7.0/README.md); [UnretiredJS](https://pypi.org/project/unretiredjs/1.4.13/)
- **Tarnish's CSP analyzer** points out CSP weaknesses and "potential ways to bypass your CSP due to whitelisted CDNs". Tarnish also fingerprints `web_accessible_resources`. [Tarnish via kalilinuxtutorials](https://kalilinuxtutorials.com/tarnish-chrome-extension-static-analysis/amp/)

### Inferences
These are practitioner checklist items. They draw on the sources above plus standard Chrome manifest semantics that this session did not re-fetch.

**Permissions**
- **Highest risk:** `debugger`, `nativeMessaging`, `proxy`, `management`, `cookies` together with broad hosts, `webRequest`/`webRequestBlocking` (enterprise or policy only in MV3), `declarativeNetRequest` with header-modifying rules, `scripting` with `<all_urls>`, `history`, `tabs` (URL access), `clipboardRead`, `identity`, `downloads.open`, `pageCapture`, `tabCapture`, `desktopCapture`, `privacy`, `contentSettings`, `webAuthenticationProxy`, `userScripts`, `offscreen` (DOM access with clipboard and audio uses).
- Score **combinations** more heavily than single permissions, for example `cookies` + `<all_urls>`, or `scripting` + `<all_urls>` + `storage` + `alarms`.
- `optional_permissions` and `optional_host_permissions` matter because they can be requested later without a store update tripping the "new permissions" disable. Show them as latent capability.

**Host access**
- Look for `<all_urls>`, `*://*/*`, `http(s)://*/*`, and specific high-value domains: banking, email, SSO such as `accounts.google.com`, `*.okta.com`, `login.microsoftonline.com`, and AI chat sites.

**Content scripts and messaging**
- In `content_scripts`, check match breadth, `all_frames: true`, `match_about_blank`/`match_origin_as_fallback`, `run_at: document_start` (can hook page APIs before page scripts) and `world: "MAIN"` (runs in page context and is subject to page CSP).
- `externally_connectable`: `matches` that include broad or attacker-registrable origins, or `ids: ["*"]`, let web pages or other extensions message the background. This is the DoubleX/EmPoWeb vulnerability class.
- `web_accessible_resources`: broad `matches` allow fingerprinting and clickjacking, and expose pages that may act on `postMessage`.

**CSP, updates and the service worker**
- `content_security_policy.extension_pages` with `unsafe-eval` is rejected in MV3; `wasm-unsafe-eval` is allowed. `sandbox` pages may allow eval, so check what they `postMessage` into.
- A non-store `update_url` (anything other than clients2.google.com or edge.microsoft.com) means self-hosted updates outside store review. This is a strong red flag for a store-listed extension.
- In the background service worker, look for `chrome.runtime.onInstalled` opening URLs (affiliate or onboarding tracking), `setUninstallURL`, `alarms` driving periodic `fetch`, and `importScripts` of non-bundled URLs.

**Code patterns** (AST-based, via Babel/acorn plus a small rule set)
- `eval`, `new Function`, `setTimeout`/`setInterval` with string arguments, `import()` of http(s) URLs, `document.createElement('script')` with remote `src`, and `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` fed by fetched data.
- `chrome.scripting.executeScript` with `world: 'MAIN'`, `updateDynamicRules`/`updateSessionRules` with fetched arrays, and DNR rules that remove `content-security-policy`, `x-frame-options` or `set-cookie`.
- `chrome.cookies.getAll`, `chrome.history.search`, `tabs.query` for `chrome://extensions`, `navigator.clipboard.readText`, `chrome.identity.getAuthToken`, and `runtime.connectNative`.

**Obfuscation signals**
- Shannon entropy per file, ratio of `\x`/`\u` escapes, very long single-line files that are not known library builds (whitelist via retire.js or hash), obfuscator.io signatures (`_0x[a-f0-9]{4,}` identifiers, string-array rotation), and `atob` followed by eval or `Function`.
- Separate minification (benign, common) from obfuscation (suspicious). Optional deobfuscation: `webcrack` or `synchrony`, which are JS deobfuscators that run in Node.

**Endpoints, secrets and SDKs**
- Extract URLs, domains and IPs with regex and AST string literals. Enrich them with registration age (RDAP), hosting provider and threat-intel reputation. Recently registered domains that appear in an update are high signal (Palant IOC methodology).
- Run a secrets scan for API keys and Firebase or Supabase config using gitleaks- or trufflehog-style regexes in JS.
- Tracking and monetisation SDKs can be fingerprinted by domain and string signatures. Examples: Google Analytics or Measurement Protocol, Mixpanel, Amplitude, Sentry, PostHog, affiliate networks, and "web data" or proxy SDKs that turn users into residential proxies.

**Fit for Vercel**
- Everything above is pure JS and runs on a Node serverless function in seconds for typical extensions, which are usually a few MB.
- retire.js can run as a library. Semgrep cannot run on Vercel because it is a Python/OCaml binary. Use an external worker, or reimplement rules as AST visitors.

### Gaps
- No public Semgrep ruleset dedicated to browser extensions was found. Semgrep's generic JS rules apply, but extension-API rules would have to be written.
- No authoritative, vendor-neutral "high-risk permission" weighting exists. Every vendor (LayerX, Secure Annex, Koi, CRXcavator historically) has its own.
- Monetisation and proxy SDK signature lists were not found as an open dataset.

## 3. Existing analysis tools and their techniques (status as of Oct 2026)

### Takeaway
The open-source tools are mostly old and unmaintained: Tarnish (about 2018), ExtAnalysis (last release about 2020), DoubleX (a 2021 proof of concept), and CRXcavator, which was discontinued around 2023. Current state of the art is commercial and LLM-heavy: Secure Annex, now acquired by Socket; Koi Wings/ExtensionTotal; and LayerX ExtensionPedia, part of Akamai. Mozilla addons-linter is the only actively maintained open-source linter, and it is Firefox-focused but mostly applies to Chromium MV3 too.

### Cited Findings
- **CRXcavator** (Duo Labs): launched 2019 as a free service that scanned the whole Chrome Web Store every 3 hours and gave each extension a quantified risk score. [SecurityWeek](https://www.securityweek.com/new-service-ciscos-duo-labs-analyzes-chrome-extensions); [Help Net Security](https://helpnetsecurity.com/?p=107200). It was reportedly "quietly killed" in 2023 after Cisco acquired Duo. Only secondary and promotional sources say so, and no official notice was found. [DEV Community](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m)
- **Tarnish** (mandatoryprogrammer, MIT) is a Chrome extension static analyzer with:
  - a manifest viewer
  - `web_accessible_resources` fingerprint analysis
  - a CSP analyzer with CDN bypass detection

  A hosted instance is at thehackerblog.com/tarnish. [Tarnish hosted](https://thehackerblog.com/tarnish); [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fmandatoryprogrammer%2Ftarnish)
- **ExtAnalysis** (Tuhinshubhra, GPL-3.0) is a Python framework to "Scan, Analyze Chrome, firefox and Brave extensions for vulnerabilities and intels". It uses a VirusTotal API key. Its latest release is v1.0.5, and the changelog shows v1.0.4 in March 2020. [GitHub releases](https://www.github.com/Tuhinshubhra/ExtAnalysis/releases)
- **DoubleX** (Fass, Somé, Backes, Stock; ACM CCS 2021). It builds an Extension Dependence Graph (control and data flow, pointer analysis, and messaging inside and outside the extension) to find attacker-controllable data flows into sensitive APIs.
  - Ran on 154,484 Chrome extensions, flagged 278, and 89% of the flagged flows were attacker-influenceable.
  - 92.64% recall on known vulnerabilities; the talk slides say 93% (151/163).
  - The repo describes itself as a proof of concept, not production-ready.

  [CISPA](https://cispa.de/en/research/publications/77765-doublex-statically-detecting-vulnerable-data-flows-in-browser-extensions-at-scale); [paper PDF](https://notify.cispa.uni-saarland.de/papers/fass2021doublex.pdf); [GitHub](https://github.com/Aurore54F/DoubleX/)
- **Mozilla addons-linter** publishes its rule catalogue, including eval and CSP rules. [Linter Rules](https://mozilla.github.io/addons-linter/). It is used by `web-ext lint`. [tessl web-ext docs](https://tessl.io/registry/tessl/npm-web-ext/8.9.0/files/docs/linting-system.md)
- **Secure Annex**: an extension security platform. Its API, as exposed via LimaCharlie, has `/manifest`, `/extensions`, `/vulnerabilities`, `/signatures`, `/urls` and `/analysis` endpoints. A Tines workflow uses it for "metadata, code review, and a summary of the risk". [LimaCharlie docs](https://docs.limacharlie.io/docs/ext-secureannex); [Tines](https://www.tines.com/docs/credentials/connect-flows/secure-annex)
  - Secure Annex was acquired by Socket (reported 2026). [CIO Influence](https://cioinfluence.com/machine-learning/socket-acquires-secure-annex-to-expand-extension-security-across-browsers-and-developer-tools/)
  - The Secure Annex blog could not be fetched; the page returned only a title.
- **Koi / ExtensionTotal**: Koi's "Wings" is described as an "LLM-first risk engine" that analyses code, publisher reputation and dynamic behaviour, and compares promised functionality to actual behaviour statically and dynamically. ExtensionTotal was the founder's earlier tool. Mostly aggregator sources. [Koi blog](https://www.koi.ai/blog); [koi.ai llms.txt](https://koi.ai/llms.txt)
- **LayerX ExtensionPedia**: a free database of risk scores for 200k+ Chrome, Edge and Firefox extensions. It combines permission and access analysis with reputation (developer, installs, ratings) and data from the LayerX platform. Whether it uses dynamic sandboxing is not stated. LayerX is Chrome Enterprise's extension-security partner. Akamai acquired LayerX; one secondary source says $205M, announced May 2026. [Akamai blog](https://www.akamai.com/blog/security/introducing-extensionpedia-your-ultimate-resource-to-assess-and-mitigate-browser-extension-risks); [Decryption Digest](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai); [LayerX + Google](https://layerxsecurity.com/blog/layerx-joins-forces-with-google-chrome-enterprise-to-stop-malicious-browser-extensions/)
- **Other commercial tools** with sandbox claims: SquareX lists "sandbox execution", and Spin.AI describes isolated sandbox analysis (vendor marketing). [SquareX webinar page](https://getstarted.sqrx.com/browser-extensions-webinar); [Decryption Digest](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai)
- **Academic follow-ups on DoubleX:** an LLM-assisted exploitation study, "LLMs unlock new paths to monetizing exploits" (arXiv 2505.11449). [arXiv](https://arxiv.org/pdf/2505.11449)

### Inferences
- **Practical open-source stack for a TypeScript app:**
  - manifest rules, hand-written and informed by the Chrome warnings list
  - Babel/acorn AST rules (eval/sinks/APIs)
  - retire.js (library CVEs)
  - addons-linter run as a library or CLI on the unpacked folder; it is Node, so it may run on Vercel within size limits
  - an entropy and obfuscation heuristic
  - URL and domain extraction plus RDAP or reputation
- **DoubleX** is Python with heavy graph construction. Treat it as an optional offline worker job, not a Vercel function.
- **EmPoWeb** (Somé, IEEE S&P 2019) covers the same message-passing vulnerability class. Its paper was not fetched this session.

### Gaps
- The Secure Annex technical blog and methodology (signatures, Yara-style rules, AI review) could not be retrieved.
- Mellon was named in the brief, but no source on it was found.
- Whether CRXcavator's code was ever open-sourced is unconfirmed.
- EmPoWeb details, and any 2024–2026 USENIX/NDSS/CCS extension-analysis papers beyond those cited, were not found in this pass.

## 4. Dynamic and sandbox analysis

### Takeaway
Dynamic analysis catches what static analysis cannot: payloads delivered at runtime via remote config, and actual exfiltration. But attackers now deliberately delay or randomise activation (days, about 10% of page loads, geofencing) to beat it. It needs real headful or new-headless Chrome with the extension loaded, honey pages, network capture and long runs, which is not feasible inside Vercel functions. A small team could run it on a container or VM worker (for example Fly.io, Cloud Run jobs, a VPS, or Vercel Sandbox if its runtime permits Chrome) for a few seconds to minutes per extension. Time-bomb coverage stays poor.

### Cited Findings
- **Hulk** (Kapravelos et al., USENIX Security 2014) is a dynamic analysis system. It loads Chrome extensions, monitors execution and network activity, and elicits behaviour with "HoneyPages" (pages that adapt to the DOM and content an extension expects) and a fuzzer for event handlers.
  - Across 48,332 extensions it found 130 malicious and 4,712 suspicious.
  - Behaviours included affiliate fraud, credential theft, JS injection and social spam.
  - It was not released publicly.

  [Hulk paper](https://sites.cs.ucsb.edu/%7Evigna/publications/2014_USENIX_Hulk.pdf); [USENIX](https://usenix.org/conference/usenixsecurity14/technical-sessions/presentation/kapravelos); [Tom's Guide](https://tomsguide.com/us/malicious-chrome-browser-extensions,news-19363.html)
- **Delayed activation in the wild** (secondary reporting):
  - Duo analysed 108 extensions and found most behaved legitimately for 24–72 hours after install before activating.
  - DarkSpectre reportedly waits three days and activates on about 10% of page loads, designed "to evade both automated scanning tools and manual review processes".

  These figures were not verified against primary sources. [Search-aggregated reports: cipherwatch](https://cipherwatch.pages.dev/articles/2026-05-04-108-malicious-chrome-extensions-data-theft); [cyberwarzone](https://cyberwarzone.com/?p=2214)
- **Anti-analysis in the wild:** the Sweet VPN group cleared traces when the extensions management page was open, and used anti-debugging checks. [Palant](https://palant.info/2025/01/20/malicious-extensions-circumvent-googles-remote-code-ban/)
- **Recorded Future's sandbox** supports browser-extension detonation in the malware-analysis sense. [Recorded Future support](https://support.recordedfuture.com/hc/en-us/articles/22694946910099-Using-the-Browser-Extension-with-the-Recorded-Future-Sandbox)

### Inferences
- **Minimal dynamic harness:**
  1. Run Playwright or Puppeteer with `--load-extension` and `--disable-extensions-except`. Chrome for Testing is needed because branded Chrome 137+ dropped `--load-extension` for stable branded builds; verify this.
  2. Log in to seeded honey accounts with fake cookies for high-value domains.
  3. Visit a scripted set of honey pages (login forms, search results, shopping, email clients).
  4. Capture all requests via CDP `Network` and the service worker target, attaching to the extension's service worker target.
  5. Diff the DOM before and after, and record `chrome.*` API calls by injecting a wrapper into extension contexts through CDP `Runtime.evaluate` on the extension targets.
  6. Fast-forward time by faking `Date` and `chrome.alarms` to trip simple time bombs.
  7. Vary geo and IP via proxies.
- **Cost:** one Chrome instance needs about 1–2 GB RAM. On a cheap VPS or container worker, roughly 30–120 s per extension, so hundreds per day per core.
- **Fit for Vercel:** Vercel serverless functions can run `@sparticuz/chromium` headless for short tasks. But loading extensions needs headful or new headless mode and a persistent context, and minutes-long runs hit function time limits. Treat dynamic analysis as an async job on separate infrastructure.
- **Server-side gating defeats sandboxes.** Remote config can return benign responses to datacenter IPs, new install IDs or unseen user agents. Static extraction of the config endpoints, followed by manual or periodic fetches of those endpoints, is a cheap middle ground.

### Gaps
- No recent (2023–2026) academic dynamic-analysis system for MV3 extensions was found in this pass. WebEval (Jagpal et al., USENIX Security 2015, Google's internal CWS pipeline) is known from prior literature, but its paper was not fetched.
- Vercel Sandbox's ability to run Chrome with extensions was not verified.
- No primary data was found on what fraction of malicious extensions evade a dynamic sandbox.

## 5. Version diffing and update monitoring (ownership-change and compromise attacks)

### Takeaway
Many of the largest incidents were clean extensions turned malicious via an update. Causes include a hijacked developer account (Cyberhaven, December 2024), long-dormant "sleeper" extensions weaponised years later (ShadyPanda/DarkSpectre), and features added 6–12 months after publication (LayerX). Store review passed every one of them. Continuously polling the update endpoint, archiving each version, and diffing permissions, endpoints and code is the single most valuable automatable control. It fits serverless well, using Vercel Cron plus Blob storage.

### Cited Findings
- **Cyberhaven.** A phishing email led to a malicious OAuth app ("Privacy Policy Extension") that gained the developer's Chrome Web Store access. Malicious v24.10.4 was pushed, detected at 23:54 UTC on 25 December 2024, removed within about an hour, and replaced by v24.10.5.
  - It exfiltrated cookies and authenticated sessions.
  - The wider campaign hit at least 36 extensions, with an estimated 2.6M users.
  - Firefox and Edge builds were not affected.

  [Cyberhaven final analysis](https://www.cyberhaven.com/engineering-blog/final-analysis-chrome-extension-security-incident); [Darktrace](https://www.darktrace.com/ja/blog/cyberhaven-supply-chain-attack-exploiting-browser-extensions); [RH-ISAC](https://rhisac.org/2025/01/02/)
- **ShadyPanda** (Koi, December 2025). Extensions uploaded in 2018–2019 ran legitimately for years. In mid-2024, five were modified to ship backdoor-like functionality through normal Chrome and Edge auto-update. Koi: "The auto-update mechanism – designed to keep users secure – became the attack vector." Reported reach: 4.3M users (The Register) or 5.6M (other sources). [The Register](https://www.theregister.com/2025/12/01/chrome_edge_malicious_browser_extensions/); [The Hacker News](https://thehackernews.com/2025/12/shadypanda-turns-popular-browser.html)
- **DarkSpectre** (Koi, December 2025) links ShadyPanda, GhostPoster and Zoom Stealer to one actor, covering 8.8M users in total. It identified 85 dormant "sleeper" extensions "still in the trust-building phase, accumulating users, earning badges, waiting." [The Hacker News](https://thehackernews.com/2025/12/darkspectre-browser-extension-campaigns.html)
- **Delayed weaponisation (LayerX):** malicious features were added 6–12 months after initial publication. [LayerX](https://layerxsecurity.com/?p=4717)
- **Concept drift:** ML detectors trained on 2017–2023 data showed "a strong concept drift effect", so a model trained once becomes stale. [arXiv 2509.21590](https://arxiv.org/abs/2509.21590)

### Inferences
- **What to diff between versions, in priority order:**
  1. `update_url`
  2. new `permissions`, `host_permissions` and `optional_*`
  3. new `content_scripts` matches or `world: MAIN`
  4. `externally_connectable` changes
  5. new or removed CSP
  6. new network domains, especially newly registered ones
  7. new dynamic-code sinks (eval, Function, `innerHTML` from fetch, `updateDynamicRules`)
  8. new obfuscated files, or an entropy jump in existing files
  9. developer key change. In CRX3 the `crx_id` stays fixed, but the set of proofs or the signing key may change; the publisher contact or website on the store listing changing is another signal.
  10. large relative code-size change in a minor version bump
- **Ownership-change signals** come mostly from store metadata, not the package: developer name, email, website, privacy-policy URL, "offered by" address, sudden ratings changes. Scrape the store listing alongside the package.
- **Serverless monitoring loop:**
  1. Vercel Cron triggers a function every N hours.
  2. For each tracked ID, call the update endpoint with `x=id%3D<id>%26v%3D<lastVersion>%26uc`; it returns `noupdate` or a new version URL (behaviour per the Chromium update protocol, not verified this session).
  3. Download, hash and store the package.
  4. Run the static pipeline and diff against the previous version.
  5. Alert on high-severity deltas.

  A lightweight version check before download keeps cost low.
- **Diff tools** (all run in Node): `jsdiff` on prettified code, a semantic manifest diff, and AST-level diffs (for example GumTree-like, or simply a diff of extracted API-call sets).

### Gaps
- No public measurement was found of what fraction of malicious incidents arrived via an update versus being malicious at first publication.
- How to detect Chrome Web Store ownership transfers directly is undocumented; the store does not expose ownership-transfer events.

## 6. Using LLMs to review extension code

### Takeaway
LLM review is now central to commercial engines (Koi Wings is "LLM-first", and Secure Annex offers AI code-review summaries). Academic LLM-based extension reviewers exist (Extension Reviewer 2024; JavaSith 2025). Published accuracy numbers specific to browser extensions are scarce. Attackers are already planting prompt-injection and refusal-bait comments in malicious packages aimed at AI scanners. Use LLMs as a summariser and triage layer over deterministic findings, never as the only detector.

### Cited Findings
- **JavaSith** (arXiv 2505.21263, 2025) is a client-side framework for browser, VS Code and npm extensions. It sends deobfuscated snippets, key function lists, the manifest and the description to a locally run LLM for privacy. The trade-off is a smaller model than state of the art. [arXiv](https://arxiv.org/pdf/2505.21263)
- **"Extension Reviewer"** is an LLM-driven framework for analysing potentially malicious extension behaviour (ACM, May 2024; details not retrieved). [unpaywall record](https://unpaywall.org/10.1145%2F3589334.3645683)
- **Koi Wings** is an "LLM-first risk engine" that compares an extension's stated purpose with its actual code behaviour. [Koi blog](https://www.koi.ai/blog)
- **Secure Annex**, via the Tines integration, provides "code review, and a summary of the risk the extension presents". [Tines](https://www.tines.com/docs/credentials/connect-flows/secure-annex)
- **Prompt injection against AI scanners in the wild:**
  - Zscaler reported a June 2026 PyPI wave (Mini Shai-Hulud, Miasma, Hades) that combined malware delivery with "indirect prompt injection" aimed at AI security tools. A variant pads comments with weapons-related text to trigger model refusals, so the model stops before reaching the payload (denial of analysis).
  - Koi found an npm package whose embedded prompt claimed the code had been tested in a sandbox.
  - Sources are mostly secondary. [Infosecurity Magazine](https://infosecurity-magazine.com/news/malware-ai-detection-npm-package); [PointGuard AI](https://www.pointguardai.com/ai-security-incidents/hades-hides-malware-behind-prompt-injection-smoke); [WinBuzzer](https://winbuzzer.com/2026/06/21/pypi-malware-wave-exposes-weak-ai-scanner-boundary-xcxwbn/)
- **Evidence on how well this works is mixed:**
  - A February 2026 preprint argues that adversarial comments fail where vulnerability patterns succeed. [arXiv 2602.16741](https://arxiv.org/pdf/2602.16741)
  - Cloudflare's testing, as summarised by a secondary outlet, reported AI code-review detection falling to 53.3% with deceptive comments under 1% of a file, against a 67.3% baseline. Not verified against Cloudflare's original. [Pulse summary](https://www.pulse.bot/cybersecurity/news/cloudflare-uncovers-promptinjection-attacks-that-fool-ai-code-review-tools-06712258-fcc4-42de-8f02-2d68ff9ee469/)
- **LLM-generated extensions** have their own security weaknesses (arXiv 2510.16823). This concerns generation rather than review, but shows LLMs miss extension-specific security semantics. [arXiv](https://arxiv.org/html/2510.16823v1)

### Inferences
- **Recommended LLM design for the app:**
  1. Strip comments and string-literal prose before sending code, or send only AST-extracted call sites and data flows.
  2. Send deterministic findings (permissions, sinks, endpoints, diffs) plus the store description, and ask the model whether the code's behaviour matches the stated purpose.
  3. Wrap code in clearly delimited untrusted-data blocks with an instruction hierarchy.
  4. Require structured JSON output with file and line evidence for each claim, then verify cited lines exist programmatically.
  5. Never let the model lower a deterministic high-severity flag. It can only add findings or explain them.
- **Diffs keep cost down.** Reviewing only changed files between versions keeps token cost small. A full review of a large extension (1–5 MB of JS) is expensive and will exceed context windows unless chunked.
- **Treat a refusal as a signal.** A refusal or truncated response from the model is itself a finding, given the refusal-bait technique.

### Gaps
- No published precision or recall was found for LLM detection of malicious browser extensions specifically. JavaSith's and Extension Reviewer's evaluation numbers were not retrieved.
- No browser-extension-specific prompt-injection incident was found; the cases cited are npm and PyPI.

## 7. What fraction of risk static analysis catches versus misses

### Takeaway
No source gives a clean percentage. Static analysis reliably surfaces capability (what an extension could do) and known-bad patterns: lab ML classifiers reach about 98% accuracy, and DoubleX about 93% recall for its vulnerability class. It misses behaviour delivered at runtime via remote config or server-gated logic, behaviour that arrives in a later update, and novel obfuscation. Accuracy also degrades sharply over time (concept drift). Commercial AV-style scanners such as VirusTotal perform poorly on known malicious extensions. Plan on static analysis plus version diffing plus reputation, with dynamic analysis as an optional deeper tier.

### Cited Findings
- **Supervised ML** (Rosenzweig, Dalla Valle, Apruzzese, Fass; ACM Transactions on the Web; arXiv 2509.21590):
  - Dataset: 7,140 malicious and 63,598 benign extensions, plus 35,462 from 2023 with unknown labels.
  - About 98% accuracy in the lab.
  - On real 2023 data it found 68 malicious extensions that had passed CWS vetting, but flagged over 1,000 as "likely malicious", a high false-positive burden.
  - VirusTotal and similar tools "perform poorly"; the authors conclude detection "is a fundamentally hard problem" with "strong concept drift".

  [arXiv 2509.21590](https://arxiv.org/abs/2509.21590)
- **DoubleX:** 92.64% recall on known vulnerable flows. It targets vulnerabilities (benign-but-buggy), not malice. [paper](https://notify.cispa.uni-saarland.de/papers/fass2021doublex.pdf)
- **Static evasion:** Palant's 63 extensions hid malice behind remote config, custom interpreters and page-context eval. The malicious logic is not in the package; only the mechanism is. [Palant](https://palant.info/2025/01/20/malicious-extensions-circumvent-googles-remote-code-ban/)
- **Store review misses:** a 2025 analysis reportedly found 154 of 341 examined extensions exfiltrating data despite MV3. A 2024 arXiv study found 86% of infringing extensions closely resemble already-vetted ones, which suggests clone detection (code similarity to known-bad) has value. These come from secondary aggregation. [Dark Reading](https://darkreading.com/application-security/google-chrome-store-review-process-data-stealer)

### Inferences
- **Static analysis is best framed as capability plus mechanism detection.** It can flag "fetches remote data and passes it into innerHTML or `updateDynamicRules` on all sites" even when the payload is absent. Those mechanism flags are the realistic target, not proving malice.
- **High-value cheap signals for a small team:**
  - code-similarity hashing (TLSH, ssdeep, or per-function hashes) against known-malicious extension corpora to catch clones
  - newly registered domains
  - non-store `update_url`
  - CSP-stripping DNR rules
  - permission jumps between versions

### Gaps
- No empirical study was found that quantifies static-versus-dynamic detection coverage on the same MV3 malicious corpus.
- No public, maintained corpus of known-malicious extension packages and IOCs was found in this pass. The arXiv 2509.21590 artifacts are released and may serve as one.
