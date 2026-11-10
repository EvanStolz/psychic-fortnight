# Store safeguards against malicious extensions, their track record, and native enterprise controls

Research date: 2026-10-29. Scope: Chrome Web Store (CWS), Microsoft Edge Add-ons, Firefox AMO, plus Chrome/Edge/Firefox admin policies. Items before 2023 are marked as background.

## 1. What the stores do: review, code rules, badges and warnings

### Takeaway
All three stores review at submission and on each update, with automated scanning plus risk-based human review. None of them watches what an extension does after approval. Badges ("Featured", "Established publisher", Firefox "Recommended") are one-off manual evaluations of quality and publisher identity, not ongoing behaviour checks. The Manifest V3 ban on remotely hosted code is the main structural defence on Chrome and Edge, and attackers have routed around it repeatedly (see section 3).

### Cited Findings

**Chrome Web Store review process**
- Review "combines manual and automated systems". All submissions go through the same process whatever the developer's tenure or user count. Reviewers may look more closely at "new developers", "new extensions", "dangerous permission requests" and "significant code changes". — [Chrome for Developers: CWS review process](https://developer.chrome.com/docs/webstore/review-process)
- Most reviews finish within a few days, but some take weeks. Updates get the same review as new items. — [CWS review process](https://developer.chrome.com/docs/webstore/review-process)
- Things that lengthen review: broad host permissions such as `<all_urls>`; sensitive permissions (`tabs` and `downloads` are powerful on their own, `cookies` and `webRequest` become sensitive alongside host permissions); and the amount and formatting of code. "Obfuscation is disallowed", while minification is allowed. — [CWS review process](https://developer.chrome.com/docs/webstore/review-process)
- Enforcement levels: **rejection** of a submission (the published version is unaffected and users are not told); **warning** for a minor violation (7 to 30 days to fix, listing stays up); **takedown** for a serious violation (removed from the store, and auto-disabled for users if it stays unresolved for several weeks, though users can re-enable it); **malware / extreme violations** (removed, the developer is not notified, the account may be suspended, and the extension is disabled on every device and cannot be re-enabled, with users told it contained malware). The page notes these practices were accurate as of 10 Dec 2021. — [CWS review process](https://developer.chrome.com/docs/webstore/review-process)

**Manifest V3 and the ban on remotely hosted code**
- Under MV3, "all of your extension's logic must be part of the extension package". `executeScript()` with external logic, `eval()` and `new Function()` can no longer run external code. Remote files, CDN-hosted libraries and libraries that fetch code at runtime are disallowed by CWS policy. The extension-page CSP allows only `self`, `none` and `wasm-unsafe-eval`. — [Chrome for Developers: Improve extension security (MV3)](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- Allowed exceptions that matter for vetting: `eval` and `new Function` still work in **sandboxed iframes**; extensions may "load data remotely at runtime", including remote JSON config that switches features on or off; and they can call remote web services. — [Improve extension security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- MV2 extensions were due to stop working in Chrome Stable at the start of 2025 (as reported June 2024). — [The Register, 23 Jun 2024](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)

**Badges**
- **Featured badge:** Chrome team members manually evaluate each extension before it gets the badge. Criteria: follows technical best practices, a high standard of user experience and design, compliance with the Developer Program Policies with no unresolved violations, and core features usable without extra credentials or payment. Developers can nominate through One Stop Support, and neither badge can be bought. — [Chrome for Developers: Discovery on the CWS](https://developer.chrome.com/docs/webstore/discovery)
- **Established Publisher badge** (launched 2022, background): given to publishers who have "verified their identity and demonstrated compliance with the developer program policies", meaning identity verification plus a positive track record with Google services. — [Google blog: Find great extensions with new CWS badges](https://blog.google/products/chrome/find-great-extensions-new-chrome-web-store-badges/)

**Enhanced Safe Browsing warning** (introduced in Chrome 91, June 2021, background)
- Users who turn on Enhanced Safe Browsing are warned ("Proceed with caution") when installing an extension that is not "trusted". Extensions count as trusted when built by a developer who follows the CWS Developer Program Policies. New developers need "a few months" of compliance to become trusted. — [The Record, 2021](https://therecord.media/google-to-warn-of-chrome-extensions-from-new-or-untrusted-developers/); [XDA](https://www.xda-developers.com/google-chrome-enhanced-safe-browsing-extension-warning/)
- A Chrome DevRel reply in 2025 noted the warning shows only for Enhanced Safe Browsing users, "which is more typical in large enterprises". Developers with established accounts still report the warning on new extensions, and Google has published no exact criteria. — [chromium-extensions Google Group threads](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/3g8tu00by2g)

**Microsoft Edge Add-ons**
- Edge Add-ons accepts Chromium MV3 extensions. Admins can force-install from either the Edge store (`https://edge.microsoft.com/extensionwebstorebase/v1/crx`) or the Chrome Web Store (`https://clients2.google.com/service/update2/crx`). — [Microsoft Learn: ExtensionSettings guide](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-ref-guide)
- Koi Security says both Google and Microsoft review an extension only when it is uploaded or updated, not after approval: "Marketplaces review extensions at submission. They don't watch what happens after approval." — [The Hacker News on ShadyPanda, Dec 2025](https://thehackernews.com/2025/12/shadypanda-turns-popular-browser.html)

**Firefox AMO**
- Mozilla's model (2020, background): extensions get automated checks and are prioritised for human review by risk factors before becoming available, usually within hours. Every version of each of the 100+ **Recommended** extensions is human-reviewed before publication. Listing pages of non-Recommended extensions carry a warning that they may not have been human-reviewed. — [Mozilla Add-ons Blog, 29 Jul 2020](https://blog.mozilla.org/addons/2020/07/29/openness-and-security-a-balancing-act-for-the-add-ons-ecosystem/)
- Since **3 Nov 2025**, all new Firefox extensions must use Firefox's built-in data-collection consent system, declaring their data practices in `manifest.json` under `browser_specific_settings.gecko.data_collection_permissions`. Existing extensions were not affected at launch. — [Extension Workshop: Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/); [Mozilla Add-ons Blog, 3 Apr 2025](https://blog.mozilla.org/addons/2025/04/03/rethinking-extension-data-consent-clarity-consistency-and-control/)
- In June 2025 Mozilla deployed a system to detect crypto-drainer add-ons, yet about 150 malicious wallet extensions still got through (GreedyBear, Aug 2025). — [BleepingComputer](https://www.bleepingcomputer.com/news/security/wave-of-150-crypto-draining-extensions-hits-firefox-add-on-store/amp/)

### Inferences
- The structural gap all three stores share is **point-in-time review**. Approval and badges certify a version and a publisher, not ongoing behaviour. Server-side switches (remote config, remote iframes, payloads fetched from remote data) are invisible to a static review of the package.
- The "Featured" badge rewards UX and policy compliance, so it is a weak security signal: an attacker who buys or compromises an old, well-run extension inherits its badge.
- Enhanced Safe Browsing trust is a publisher-reputation signal. It does nothing against account takeover (Cyberhaven) or a long-trusted publisher turning bad (ShadyPanda).

### Gaps
- No official Edge Add-ons document describing how its certification review works (automated vs manual, review triggers) was found in this session.
- No current, specific statement that AMO signing is mandatory for release Firefox was re-verified this session. It is long-standing background knowledge (since about 2016) and should be checked before citing.
- I could not fetch the body of Google's 20 Jun 2024 post "Staying Safe with Chrome Extensions" (it reportedly describes Safety Check flagging malware, unpublished and policy-violating extensions). Only its <1% figure was confirmed through The Register.

## 2. How effective the stores have been: numbers

### Takeaway
The best independent data (Hsu, Tran and Fass, AsiaCCS 2024; data from Jul 2020 to Feb 2023) found that 346M+ users installed a "security-noteworthy" extension over three years, and that malware extensions stayed live for about **380 days** on average. Google answers that **under 1% of 2024 CWS installs** contained malware. Both can be true: a small share of installs is still a very large number of users at Chrome's scale.

### Cited Findings
- Study: "What is in the Chrome Web Store? Investigating Security-Noteworthy Browser Extensions" by Sheryl Hsu, Manda Tran (Stanford) and Aurore Fass (CISPA), ACM AsiaCCS 2024. It covers extensions available from 5 Jul 2020 to 14 Feb 2023, when the store held about 125,000 extensions. — [arXiv 2406.12710](https://arxiv.org/html/2406.12710); [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)
- Security-noteworthy extensions (SNEs: malware, policy violation or vulnerable code) were installed by **346M+ users over three years**: 280M for malware, 63M for policy violations and 3M for vulnerable code. — [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)
- Average time in the store: **about 380 days for malware SNEs** and about 1,248 days for vulnerable-code SNEs. The longest-lived malicious extension, "TeleApp", lasted 8.5 years (last updated 13 Dec 2013, found to contain malware 14 Jun 2022). — [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)
- About 60% of extensions have never been updated. 78 of 184 disclosed vulnerable extensions (42%) were still in the store and still vulnerable two years after disclosure. About 40,000 extensions (about a third) use a JS library with a known vulnerability, affecting about 500M users. About half of SNEs have no user reviews. — [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)
- The authors suggest code-similarity clustering as a promising early-detection technique. — [arXiv 2406.12710](https://arxiv.org/html/2406.12710)
- Google's response (Chrome Security blog, 20 Jun 2024): **less than 1% of all CWS installs in 2024 included malware**. — [The Register](https://www.theregister.com/2024/06/23/google_chrome_web_store_vetting/)
- Microsoft's StegoAd takedown (Jun 2026): 119 Edge extensions and about 2.6M users, discovered by Microsoft itself. Techzine reports 90 developer accounts suspended. — [Malwarebytes, 29 Jun 2026](https://www.malwarebytes.com/blog/news/2026/06/119-edge-extensions-promised-useful-tools-instead-downloaded-malware); [Techzine](https://www.techzine.eu/news/security/142570/119-malicious-edge-extensions-steal-data-from-2-6-million-users/)

### Inferences
- An average of 380 days live for malware shows that the stores' main detection mode is after the fact (researcher reports, takedowns), not prevention at review.
- The study's finding that most extensions are never updated, and that vulnerable libraries are common, points to a vetting gap distinct from malice: abandoned or vulnerable extensions that the stores do not remove.

### Gaps
- No Google-published yearly count of extensions removed or developer accounts terminated for 2023 to 2026 was found.
- No comparable independent study of Edge Add-ons or AMO dwell time was found.
- The study's data ends Feb 2023, so it does not measure the MV3-era store.

## 3. Notable incidents, 2023 to 2026, that passed store review

### Takeaway
The dominant patterns are (a) **developer account takeover** pushing a malicious update to a trusted extension (Cyberhaven, Dec 2024); (b) **long-dormant "sleeper" extensions**, often Featured or Verified, flipped by an update or by server-side code (RedDirection Jul 2025, ShadyPanda Dec 2025, StegoAd Jun 2026); (c) **publishers with privacy-themed products harvesting data** under a disclosed but buried policy (Urban VPN, Dec 2025); and (d) **mass-produced impersonators** (fake AI assistants, fake crypto wallets). Several carried a Featured or Verified badge when they went bad.

### Cited Findings

| Incident | Date disclosed | Store(s) | Scale | Mechanism | Time undetected | Badge |
|---|---|---|---|---|---|---|
| Cyberhaven and related campaign | 25 to 27 Dec 2024 | CWS | Cyberhaven about 400K users. Campaign at least 35 to 36 extensions (counts vary by source) | Phishing email posing as CWS developer support led to an OAuth app ("Privacy Policy Extension") that took over the developer account. Malicious v24.10.4 uploaded and passed review | Malicious version live from 01:32 UTC 25 Dec to 02:50 UTC 26 Dec. Campaign infrastructure dates back to Mar 2024 | Not confirmed |
| RedDirection (Geco colorpick and others) | Jul 2025 (Koi) | CWS and Edge | 18 extensions (11 Chrome, 7 Edge), about 2.3M users (1.7M Chrome) | Legitimate for years, then a malicious update (27 Jun cited) that hijacked browsing and redirected users | Years as benign before activation | Geco: Google verified badge plus Featured |
| ShadyPanda | 1 Dec 2025 (Koi) | CWS and Edge | 4.3M installs in total: about 300K (Chrome RCE backdoor) plus about 4M (5 Edge spyware extensions, WeTab about 3M) | Phase 3 (mid-2024): an update to 5 extensions fetched and ran remote JS every hour. Obfuscated, switched to benign behaviour when DevTools opened | About 7-year operation. Three of the extensions had been legitimate since 2018-19 | Clean Master: Featured plus Verified |
| Urban VPN Proxy and 7 sibling extensions | 15 to 16 Dec 2025 (Koi) | CWS and Edge | 8M+ combined (Urban VPN about 6M Chrome, 1.3M Edge) | v5.5.0 (9 Jul 2025) added a module capturing ChatGPT, Claude and Gemini conversations, sent to the publisher (affiliated with data broker BiScience). Disclosed in the privacy policy | About 5 months (Jul to Dec 2025) | Featured |
| GreedyBear (fake crypto wallets) | Aug 2025 (Koi) | AMO | 150 extensions, about $1M stolen (estimate) | Impersonated MetaMask, TronLink, Exodus, Rabby. Continuation of the earlier "Foxy Wallet" campaign (40+ add-ons) | Got past Mozilla's crypto-drainer detection, deployed June 2025 | n/a |
| AiFrame (fake AI assistants) | Feb 2026 (LayerX) | CWS | About 30 extensions, about 260K installs | Posed as ChatGPT, Claude, Gemini and Grok tools. UI loaded from a remote server in an iframe, so behaviour changes without a new version going through review. Stole Gmail content, API keys and credentials | Not stated. Some extensions were still live at press time per Dark Reading | Several Featured |
| StegoAd | Jun 2026 (Microsoft) | Edge | 119 extensions, about 2.6M users | Code hidden in images (steganography). Sleeper behaviour, with about 10% of installs running the next stage | "For some time", not quantified | Not stated |

Sources for the table:
- Cyberhaven: phishing on 24 Dec 2024, malicious v24.10.4, detected 23:54 UTC on 25 Dec, live window 01:32 UTC 25 Dec to 02:50 UTC 26 Dec, about 400K users, at least 35 or 36 extensions in the campaign, C2 infrastructure from Mar 2024. — [LayerX](https://layerxsecurity.com/blog/attack-campaign-targeting-browser-extensions); [RH-ISAC](https://rhisac.org/threat-intelligence/cyberhaven-extension-compromise-part-of-broader-campaign-affecting-multiple-chrome-extensions/); [Reco](https://reco.ai/blog/cyberhaven-supply-chain-attack-how-one-phishing-email-led-to-over-400-000-compromised-browsers); [Security Affairs](https://securityaffairs.com/172491/hacking/chrome-browser-extensions-compromise.html)
- RedDirection: [CSO Online](https://www.csoonline.com/article/4019477/verified-featured-and-malicious-reddirection-campaign-reveals-browser-marketplace-failures.html); [The Register, 8 Jul 2025](https://www.theregister.com/2025/07/08/browser_hijacking_campaign/); [Dark Reading](https://www.darkreading.com/endpoint-security/chrome-store-features-extension-poisoned-sophisticated-spyware). Google later said all of the Chrome extensions were removed, while Dark Reading reported Geco was still live at the time of writing.
- ShadyPanda: [The Hacker News, Dec 2025](https://thehackernews.com/2025/12/shadypanda-turns-popular-browser.html); [The Register, 1 Dec 2025](https://www.theregister.com/2025/12/01/chrome_edge_malicious_browser_extensions/). Phases: 2023 affiliate fraud (20 CWS and 125 Edge extensions); early 2024 search hijacking through trovi.com and cookie theft; mid-2024 hourly RCE from api.extensionplay[.]com; Edge spyware sending data to China. Microsoft said it removed all identified extensions. The Register reported the Edge set still live at publication, then later removed. Koi's original blog URL now redirects to Palo Alto Networks.
- Urban VPN: [Koi Security](https://www.koi.ai/blog/urban-vpn-browser-extension-ai-conversations-data-collection); [The Register, 16 Dec 2025](https://www.theregister.com/2025/12/16/chrome_edge_privacy_extensions_quietly/); [The Hacker News](https://thehackernews.com/2025/12/featured-chrome-browser-extension.html?m=0); [CSO Online](https://www.csoonline.com/article/4106949/featured-urban-vpn-caught-stealing-private-ai-chats.html)
- GreedyBear: [BleepingComputer](https://www.bleepingcomputer.com/news/security/wave-of-150-crypto-draining-extensions-hits-firefox-add-on-store/amp/); [The Hacker News](https://thehackernews.com/2025/08/greedybear-steals-1m-in-crypto-using.html?hl=en_US); [Koi](https://koi.ai/blog/greedybear-650-attack-tools-one-coordinated-campaign). Mozilla removed and blocklisted the add-ons.
- AiFrame: [The Register, 12 Feb 2026](https://www.theregister.com/2026/02/12/30_chrome_extensions_ai/); [Akamai](https://www.akamai.com/blog/security-research/aiframe-fake-ai-assistant-extensions-targeting-260000-chrome-users-via-injected-iframes); [Dark Reading](https://www.darkreading.com/cyber-risk/chrome-fake-ai-browser-extensions); [Infosecurity Magazine](https://infosecurity-magazine.com/news/fake-ai-assistants-google-chrome). LayerX published the extension IDs.
- StegoAd: [Malwarebytes, 29 Jun 2026](https://www.malwarebytes.com/blog/news/2026/06/119-edge-extensions-promised-useful-tools-instead-downloaded-malware); [Techzine](https://www.techzine.eu/news/security/142570/119-malicious-edge-extensions-steal-data-from-2-6-million-users/)

### Inferences
- **The MV3 remote-code ban was bypassed** in ShadyPanda (an hourly JS fetch and run) and sidestepped in AiFrame (a remote iframe UI). Server-controlled behaviour is the main gap a vetting tool can only partly close with static analysis; it needs **change monitoring** (new versions, new permissions, new remote endpoints) and checks for patterns that fetch and run remote content.
- **Badges correlate with attacker targeting**, since Featured or Verified extensions bring instant trust and distribution. An internal tool should not use store badges as a pass signal.
- **Ownership or publisher changes and sudden behaviour changes in long-stable extensions** are recurring precursors (RedDirection, ShadyPanda). They are cheap signals to track per update.
- **Account-takeover incidents are time-boxed** (Cyberhaven was live about 25 hours). Only version pinning or update holds protect against them, not initial vetting.

### Gaps
- The widely repeated figure of "35 extensions / 2.6M users" for the Cyberhaven-era campaign was not confirmed by the sources fetched here. Secure Annex's list is the reported primary source and was not checked.
- Whether Cyberhaven's extension carried a Featured badge was not confirmed.
- Per-extension removal dates for RedDirection and AiFrame were not available.
- No Edge-specific incident data was found beyond ShadyPanda, RedDirection and StegoAd. The Edge figures in ShadyPanda come from Koi only.

## 4. Native enterprise controls: Chrome, Edge, Firefox, and built-in risk scoring

### Takeaway
All three browsers support allowlist, blocklist and force-install controls plus permission and host restrictions through an `ExtensionSettings` JSON policy (Firefox added `blocked_permissions` and `runtime_blocked_hosts` in v153). Chrome and Edge both have a native **user request then admin approve** workflow. Chrome's **only built-in risk scoring is third-party (Spin.AI)**, surfaced in the Admin console and the Extension Usage Report. Edge added an "Extension monitoring" page in Jun 2026 that claims to help "evaluate risk", with no published scoring method. Firefox has no console or risk scoring.

### Cited Findings

**Chrome (Chrome Enterprise Core, free; Premium, paid)**
- `ExtensionSettings` fields: `installation_mode` (allowed, blocked, force_installed, normal_installed, removed), `allowed_types`, `blocked_install_message` (up to 1,000 chars), `blocked_permissions` (installed extensions that need a blocked permission stop loading; optional permissions are auto-declined), `runtime_blocked_hosts` / `runtime_allowed_hosts` (up to 100 entries, no paths, blocking script injection, cookie access and webRequest changes), `install_sources`, `minimum_version_required`, `update_url`, `override_update_url`, `toolbar_pin`, `file_url_navigation_allowed` (Chrome 119+). — [Chrome Enterprise help: ExtensionSettings guide](https://support.google.com/chrome/a/answer/9867568)
- Related standalone policies (overridden by ExtensionSettings): ExtensionInstallAllowlist, ExtensionInstallBlocklist, ExtensionInstallForcelist, ExtensionAllowedTypes, ExtensionInstallSources. — [Microsoft Learn ExtensionSettings guide (same Chromium policies)](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-ref-guide)
- Admins can allow or block extensions by the permissions they request, through the Admin console. — [Chrome Enterprise help: App and extension permissions](https://support.google.com/chrome/a/answer/7515036)
- **Extension request workflow** (needs Chrome Enterprise Core, Chrome 92+, managed browsers only). Users click "Request" in the CWS, review the data types the extension can access and send. Admins go to Devices > Chrome > Apps & extensions > Requests and choose Force install (optionally pinned), Allow install or Block (with optional message) per organizational unit. Users get a Chrome notification of the decision. Admin email alerts need reporting or activity rules. The help page describes **no justification field and no risk score in the request view**. Policies apply per OU, not per user. New devices can take up to 24h to send requests. — [Chrome Enterprise help: Let users request extensions](https://support.google.com/chrome/a/answer/10405494?hl=en)
- The request workflow launched in Aug 2021 (background), along with the App Details API for programmatic risk and audit workflows, permissions and privacy-policy detail in the Apps & Extensions report, and version pinning (User and Managed Guest Sessions only). — [Google Cloud blog, 19 Aug 2021](https://cloud.google.com/blog/products/chrome-enterprise/extension-management-enhancements)
- **Chrome Web Store for Enterprise** (announced Oct 2024, launched 23 Jan 2025, no added cost with Chrome Enterprise Core): a curated landing page of IT-approved extensions with company branding. **Third-party risk scores by Spin.AI** appear in the Extension Usage Report. Admins can sort by score, block high-risk extensions, and export scores by CSV or the Management API. — [Google Cloud blog, Jan 2025](https://cloud.google.com/blog/products/chrome-enterprise/boost-productivity-and-security-with-the-new-chrome-web-store-for-enterprises); [TechRadar](https://www.techradar.com/pro/security/google-wants-to-give-it-admins-more-control-over-what-chrome-extensions-you-use-at-work); [SiliconANGLE, 23 Jan 2025](https://siliconangle.com/2025/01/23/google-announces-new-chrome-web-store-enterprise-browser-extension-control)
- **Spin.AI** integration (since about 2023): a safety score out of 100 built from 15+ business and security factors, reached from a link in the Admin console. The full product (SpinApps / SpinCRX, the latter launched 2 Sep 2025) adds automated monitoring, an approval workflow, AI-extension checks, reputation analysis and sandbox behaviour analysis. — [Spin.AI](https://spin.ai/news/spin-ai-introduces-chrome-extension-risk-assessment-integration-in-partnership-with-google-chrome/); [Spin.AI SpinCRX launch](https://spin.ai/news/spin-ai-launches-spincrx/); [Help Net Security](https://www.helpnetsecurity.com/?p=261635)
- Customer example (vendor-sourced): Outbrain uses the Spin.AI-powered risk assessment together with the Chrome Enterprise Core request workflow to decide allow or deny. — [Google Cloud customer blog](https://cloud.google.com/blog/products/chrome-enterprise/outbrain-taking-control-of-extension-security-with-chrome-enterprise)

**Microsoft Edge**
- The same Chromium `ExtensionSettings` JSON, set by GPO, the registry (`HKLM\Software\Policies\Microsoft\Edge\ExtensionSettings`) or Intune. Edge-specific fields: `toolbar_state` (Edge 103+), `sidebar_auto_open_blocked` (Edge 119+), and `override_update_url` (Edge 93+). It shares the 100-host limit for runtime hosts. Microsoft provides an Extension Settings Generator tool. Doc updated 15 Jun 2026. — [Microsoft Learn: ExtensionSettings guide](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-ref-guide)
- The **Edge management service** in the Microsoft 365 admin center (needs Global admin or Edge admin) supports extension requests: block external extensions, let users request, and admins approve under Managed extensions > Requests. Opt-in email digests (daily, weekly or monthly) arrived with MC767479 in 2024. — [Peter van der Woude, Jan 2026](https://petervanderwoude.nl/post/allowing-users-to-request-the-installation-of-browser-extensions-for-microsoft-edge/); [MC767479](https://mc.merill.net/message/MC767479)
- **Extension monitoring** (MC1393800, published 16 Jun 2026, GA mid-Jun 2026, off by default): a consolidated list of extensions installed across managed users, to "identify installed extensions, evaluate risk", plus one place to handle requests across all configuration policies. The notice does not describe a risk-scoring method or data source. — [MC1393800](https://mc.merill.net/message/MC1393800)

**Firefox**
- `ExtensionSettings` per-extension keys: `installation_mode` (allowed, blocked, force_installed, normal_installed), `install_url`, `update_url` (151), `blocked_install_message`, `updates_disabled` (89), `default_area` (113), `temporarily_allow_weak_signatures` (127), `private_browsing` (136), and in **Firefox 153** `runtime_blocked_hosts`, `runtime_allowed_hosts`, `blocked_permissions` and `allowed_permissions`. Wildcard-only keys: `install_sources`, `allowed_types`, `restricted_domains` (content scripts cannot run). `blocked_permissions` does **not** cover host permissions such as `<all_urls>`. — [Firefox admin docs: ExtensionSettings](https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/)
- Firefox has no cloud admin console, request workflow or risk scoring equivalent. Policies are deployed through GPO, `policies.json` or MDM. — [Firefox admin docs](https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/) (inferred from the scope of the documentation; no cloud console is referenced)

### Inferences
- Native controls are strong at **enforcement** (block or allow by ID, by permission and by host, plus force-install and minimum version) but weak at **assessment**. Google's only scoring is a third-party Spin.AI score, and Microsoft's "evaluate risk" is unspecified.
- `minimum_version_required` and `override_update_url` (self-hosted update URL) let an organisation **hold updates** until they are vetted. That is the native lever against Cyberhaven-style malicious updates, but it requires the organisation to host or mirror CRX files.
- The 100-entry limit on runtime hosts makes `runtime_blocked_hosts` practical for protecting a short list of crown-jewel domains (SSO, email, finance), not for broad allowlisting.

### Gaps
- Whether Spin.AI scores are re-evaluated on each extension update, and how quickly they react to incidents, was not found.
- Whether Chrome Enterprise Premium adds native extension telemetry or behaviour risk signals beyond Spin.AI was not confirmed in this session.
- How Edge Extension monitoring evaluates risk, and its licensing, are undocumented in the notice.

## 5. What admins still do by hand when a user requests an extension

### Takeaway
The native workflows only route the request. The admin still has to research the extension, judge the risk, choose a policy scope, and keep watching it after approval.

### Cited Findings
- Chrome's request view shows the request and its status. The decision is a manual choice of Force install, Allow or Block per OU. No justification field or built-in risk score appears in the documented flow. — [Chrome Enterprise help: Let users request extensions](https://support.google.com/chrome/a/answer/10405494?hl=en)
- Risk context comes from a separate place (the Spin.AI score in the Extension Usage Report or by link) or from a paid third-party tool. — [Google Cloud blog, Jan 2025](https://cloud.google.com/blog/products/chrome-enterprise/boost-productivity-and-security-with-the-new-chrome-web-store-for-enterprises); [Spin.AI](https://spin.ai/news/spin-ai-launches-spincrx/)
- Edge requests are approved by hand under Managed extensions > Requests, and Microsoft's own rollout guidance tells admins to "review installed extensions" and "update your extension-request process". — [Peter van der Woude](https://petervanderwoude.nl/post/allowing-users-to-request-the-installation-of-browser-extensions-for-microsoft-edge/); [MC1393800](https://mc.merill.net/message/MC1393800)
- Stores do not monitor after approval, and nothing natively re-alerts an admin when an approved extension changes owner, permissions or behaviour (Koi's critique). — [The Hacker News](https://thehackernews.com/2025/12/shadypanda-turns-popular-browser.html)

### Inferences
Manual steps a vetting tool could take over:
1. Collect a business justification. Not captured natively in Chrome.
2. Pull and unpack the CRX and inspect the manifest permissions, host permissions, CSP, update_url and externally_connectable.
3. Static code review: obfuscation, remote fetch-and-run patterns, remote iframes, `eval` in sandbox pages, and contacted domains.
4. Check publisher reputation and history: ownership changes, account age, other extensions, privacy policy, and data-broker affiliations such as Urban VPN and BiScience.
5. Check against known-bad IOC lists from Koi, LayerX, Secure Annex and others.
6. Decide the policy scope (OU), `runtime_blocked_hosts` for sensitive domains, and whether to pin the version.
7. **Re-vet on every update**, the gap behind ShadyPanda, RedDirection, Urban VPN and Cyberhaven. Natively this needs self-hosting or `minimum_version_required` gymnastics.
8. Run periodic inventory and drift reviews. Edge Extension monitoring and the Chrome Extension Usage Report give the inventory but no behavioural diff.

### Gaps
- There is no published data on how long enterprise admins spend per extension request.
