# Reputation, publisher history and ownership changes in browser extension risk

Research notes, compiled 2026-10-29. Focus on 2023 to Oct 2026 cases, older cases as background. Every claim has an inline source. Where secondary coverage disagrees on numbers, both figures are given.

## 1. Case studies: extensions sold, hijacked or turned malicious after building trust

### Takeaway
Across a decade of cases, the pattern is the same. A legitimate extension builds users, ratings and sometimes a Featured or verified badge. Control then changes, through a sale, a phished developer account or the original publisher's own pivot, and a silent auto-update ships the payload. Reputation signals looked good in nearly every case, and new permissions were often not needed because the existing ones were already broad. Time to detection ranges from under a day (Cyberhaven, a security company watching its own product) to years (ShadyPanda, RedDirection).

### Cited Findings

**2026: QuickLens and ShotBird (sold through a broker, then weaponized)**
- QuickLens ("Search Screen with Google Lens") had about 7,000 users. ShotBird had about 800. ShotBird launched Nov 2024 and got the Featured flag in Jan 2025 — [The Hacker News, 9 Mar 2026](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- QuickLens was listed for sale on ExtensionHub on 11 Oct 2025, two days after it was published. Ownership moved to `support@doodlebuggle.top` on 1 Feb 2026, and the malicious update shipped on 17 Feb 2026, 16 days after the transfer. ShotBird was transferred to a Gmail address around Feb 2026 — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- QuickLens update: kept the original function, stripped security headers (X-Frame-Options, CSP) from every HTTP response, fingerprinted country, browser and OS, and polled a server every five minutes for JavaScript. That JavaScript was stored and run on each page load through a hidden 1x1 image `onload` handler. Tuckner: "The actual malicious code never appears in the extension's source files." — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- ShotBird update: a fake Chrome update prompt leading to a ClickFix page that ran PowerShell and downloaded "googleupdate.exe", plus hooks on input, textarea and select fields to capture credentials, card data and IDs — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- The original developer's other extensions (Radial New Tab, Reditop, AudioMatch, Sidewiki) also had Featured badges. The developer has an ExtensionHub account and tried to sell a domain for $2,500 — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- Socket later linked QuickLens to a wider campaign of 19 Chrome and Edge extensions, some of which "began as legitimate products before being acquired and weaponized." LayerX separately reported that malicious functionality appeared "immediately after ownership transfers" across several cases — summarised in search results citing [Cybernews](https://cybernews.com/security/chrome-extension-ownership-transfer-malware/) and [LayerX](https://layerxsecurity.com/blog/silent-takeover-how-purchased-chrome-extensions-became-remote-controlled-webpage-manipulation-tools/). The LayerX page now redirects and could not be read directly.

**Dec 2025: ShadyPanda (Koi Security), long-running sleeper on Chrome and Edge**
- About 4.3M Chrome and Edge users over roughly seven years, in two operations: a 300,000-user remote code execution backdoor (for example Clean Master) and a roughly 4M-user spyware set led by WeTab (about 3M installs) — [Hackread, 3 Dec 2025](https://hackread.com/shadypanda-attack-spied-chrome-edge-users/); [Koi blog (now redirects)](https://www.koi.ai/blog/4-million-browsers-infected-inside-shadypanda-7-year-malware-campaign)
- Clean Master "had earned Google's 'Featured' and 'Verified' statuses before it was weaponized." A silent mid-2024 update made it check a server hourly for commands. Earlier, in 2023, 145 extensions injected affiliate codes into eBay and Amazon links, and in 2024 they redirected searches through trovi.com — [Hackread](https://hackread.com/shadypanda-attack-spied-chrome-edge-users/)
- Secondary coverage says the extensions were published around 2018 and stayed benign for years. One count is 145 extensions (20 Chrome, 125 Edge). Google removed the Chrome ones, while some Edge listings reportedly stayed up, including one at about 3M installs — [Fox News](https://www.foxnews.com/tech/malicious-browser-extensions-hit-4-3m-users); [Ethical Hacking News](https://ethicalhackingnews.substack.com/p/a-massive-malicious-browser-extension). Removal status differs between sources.
- Trey Ford (Bugcrowd): store review focuses on "initial submissions… and not ongoing behaviour after initial approval" — [Hackread](https://hackread.com/shadypanda-attack-spied-chrome-edge-users/)

**Dec 2025: Urban VPN Proxy (Featured, own publisher, data broker pivot)**
- Koi found that Urban VPN Proxy, which had a Featured badge, captured conversations from ten AI platforms (ChatGPT, Claude, Gemini and others). Collection started with v5.5.0 on 9 Jul 2025, was on by default, and could only be stopped by uninstalling — [Koi Security](https://www.koi.ai/blog/urban-vpn-browser-extension-ai-conversations-data-collection); [The Hacker News, Dec 2025](https://thehackernews.com/2025/12/featured-chrome-browser-extension.html)
- The publisher, Urban Cyber Security Inc., is affiliated with the data broker BiScience. Urban VPN alone has about 6M users, and about 8M across sibling extensions. The privacy policy does disclose AI prompt collection for "marketing analytics" — [The Register, 16 Dec 2025](https://www.theregister.com/2025/12/16/chrome_edge_privacy_extensions_quietly/); [Infosecurity Magazine](https://infosecurity-magazine.com/news/urban-vpn-proxy-harvesting-ai-chats). There was no ownership change here: a trusted publisher changed behaviour itself, and the Featured badge did not prevent it.

**Jul 2025: RedDirection / Geco colorpicker (Koi Security)**
- 18 extensions (10 Chrome, 8 Edge), over 2.3M users in total. They started clean and "sometimes remained that way for years" before updates added browsing tracking: every navigated URL was sent to a C2 server with a victim ID, with redirect on command. Updates "auto-installed silently" — [The Register, 8 Jul 2025](https://www.theregister.com/security/2025/07/08/browser-hijacking-campaign-infects-23m-chrome-edge-users/1236258)
- Geco had a Google verified badge, 800+ reviews, 4.2 stars and Featured placement. It was still downloadable from both stores at press time. Microsoft removed and disabled the Edge ones, and Google had not responded by 10 Jul — [The Register](https://www.theregister.com/security/2025/07/08/browser-hijacking-campaign-infects-23m-chrome-edge-users/1236258); [Infosecurity Magazine](https://www.infosecurity-magazine.com/news/18-malicious-chrome-edge-extensions/)
- The Chrome listing showed Featured, about 823 ratings and about 2,000,000 users (cached store page). Coverage did not report any permission change. Whether the developer account changed hands was not stated — [Chrome Web Store listing](https://chromewebstore.google.com/detail/color-picker-tool-geco/eokjikchkppnkdipbiggnmlkahcdkikp); [The Register](https://www.theregister.com/security/2025/07/08/browser-hijacking-campaign-infects-23m-chrome-edge-users/1236258)

**Dec 2024: Cyberhaven and the developer-account phishing campaign**
- On 24 Dec 2024 a Cyberhaven employee was phished. A malicious OAuth app called "Privacy Policy Extension" gained Chrome Web Store publish rights, and the attackers pushed v24.10.4, which was live for under 24 hours (25 to 26 Dec) before the clean v24.10.5 — [SOCRadar](https://socradar.io/blog/phishing-attack-cyberhaven-chrome-extension/); [GASA](https://gasa.org/knowledge-base/blog/cyberhaven-and-the-chrome-extension-breach-lessons-from-a-sophisticated-phishing-attack)
- Campaign scope: about 35 extensions and over 2.6M users. Other counts are 33 or 36. Spin.AI later counted 40 extensions and 3.7M users. Indicators go back to March 2024 — [TechSpot](https://www.techspot.com/news/106205-widespread-cyberattack-targets-google-chrome-extensions-compromises-2-6-million-devices.html); [Spin.AI](https://spin.ai/blog/cyberhaven-attack-puts-more-users-at-risk/); [LayerX, 30 Dec 2024](https://layerxsecurity.com/blog/attack-campaign-targeting-browser-extensions)
- Relevance to reputation: the publisher was a security company with a verified identity. A legitimate, reputable publisher account was the attack vector.

**Background cases (2017 to 2021)**
- **Web Developer (Aug 2017):** author Chris Pederick was phished by an email posing as a Google store-policy notice. The attackers pushed v0.4.9 with ad injection to about 1,044,000 users, and v0.5 removed it. Proofpoint tied this to a spree that compromised eight Chrome extensions — [The Register, 2 Aug 2017](https://www.theregister.com/2017/08/02/chrome_web_developer_extension_hacked/); [Proofpoint](https://proofpoint.com/us/threat-insight/post/threat-actor-goes-chrome-extension-hijacking-spree)
- **Particle for YouTube (Jul 2017):** the developer announced the sale on 11 Jul. The buyer added an "algoad" folder injecting ads into Google, Amazon, eBay, Booking.com and others, and it was taken down on 14 Jul. Only the Chrome version was sold — [The Next Web, 18 Jul 2017](https://thenextweb.com/google/2017/07/18/popular-chrome-extension-became-adware/); [Sophos](https://news.sophos.com/de-de/2017/07/18/when-good-extensions-go-bad-buyer-turns-particle-into-adware)
- **The Great Suspender (2020 to 21):** over 2M users. The original developer sold it in June 2020 to an unidentified party, and v7.1.8 added a disguised analytics script linked to ad fraud and tracking. Microsoft blocked it from November 2020. Google removed it and disabled it on users' machines in early Feb 2021, about 7 to 8 months after the sale — [Security Affairs](https://securityaffairs.com/114272/malware/the-great-suspender-extension-malware.html); [CNCF TAG-Security catalog](https://tag-security.cncf.io/community/catalog/compromises/2020/thegreatsuspender/)
- **Nano Adblocker / Nano Defender (Oct 2020):** about 300,000 installs combined. Developer Hugo Xu announced the sale to Turkish developers on 4 Oct 2020. Raymond Hill flagged the malicious code on 16 Oct, about 12 days later. Users saw automatic Instagram likes, and the code could collect request headers including session cookies via remote configuration. The Firefox and Edge versions were not affected — [Gigazine](https://www.gigazine.net/gsc_news/en/20201021-adblockers-malicious); [gHacks](https://www.ghacks.net/?p=165492); [SoyaCincau](https://soyacincau.com/2020/10/21/chrome-extension-adblocker-infected-malware-nano-adblocker-nano-defender/amp/)

### Inferences
- Badges and ratings did not protect users in the best-documented 2025 to 2026 cases (Geco: Featured and verified, 800+ reviews; Clean Master: Featured and Verified; Urban VPN: Featured; ShotBird: Featured). The sources give no sign that badges are revoked on transfer or re-checked on update.
- Most payloads used existing permissions or remote code (header stripping, remotely fetched JS, `declarativeNetRequest` redirects). So "no new permissions requested" is a weak all-clear.
- Single-store scope is common (Particle, Nano and Web Developer hit Chrome only). Checking whether the same ID or name on another store diverged in version or publisher could be a useful cross-check.
- There are three distinct routes to the same outcome: (a) sale, (b) account takeover by phishing or OAuth, (c) the original publisher's own monetisation pivot (Urban VPN, ShadyPanda's long-run plan). Ownership-change detection only catches (a), and only when the listing's publisher fields change.
- Typical time between sale and payload is short (QuickLens 16 days, Nano under 2 weeks, Particle days). An ownership change followed by an update within weeks is a strong combined signal.

### Gaps
- **Hover Zoom:** not researched in this pass. It is widely reported as sold and turned into a data collector around 2013, but I have no verified source here.
- For RedDirection and ShadyPanda, the sources do not say whether developer accounts changed hands or whether permissions changed in the malicious versions.
- Time to detection for QuickLens and ShotBird is not stated.
- Koi's original blog posts now redirect to paloaltonetworks.com, which suggests Koi was acquired by Palo Alto Networks (not verified), so ShadyPanda and RedDirection details rely on secondary coverage.

## 2. The extension acquisition market and monetisation

### Takeaway
Buying an extension is cheap and procedurally trivial. Tuckner bought one for $50 and transferred it for a $5 fee, then pushed code within hours. Brokers such as ExtensionHub list extensions openly, and developers report a steady flow of buy offers, some explicitly nefarious. Monetisation comes through affiliate-link injection, search hijacking, data-broker collection (BiScience / Urban VPN) and residential-bandwidth or scraping SDKs (Mellowtel).

### Cited Findings
- Tuckner (Secure Annex) bought "Website Blocker" for $50, transferred it to himself via the Chrome Web Store for a $5 fee, submitted an update, and "within hours" pushed code (a harmless Rickroll redirect using an existing permission) — [CyberScoop, 27 Mar 2025](https://cyberscoop.com/browser-extension-sales-permissions-hidden-threat/); original post [Secure Annex, "Buying browser extensions for fun and profit"](https://secureannex.com/blog/buying-browser-extensions/) (the page body did not render when fetched)
- Tuckner warns that already-granted permissions can be repurposed: `declarativeNetRequest` to redirect an Office 365 login to phishing, `tabs` for screenshots, `cookies` for session data. Collected data could be sold to initial-access brokers. Users are prompted only if new permissions are requested — [CyberScoop](https://cyberscoop.com/browser-extension-sales-permissions-hidden-threat/)
- The transfer process goes through Google's One Stop Support form. The receiving account must be registered ($5), the current owner confirms by email, and it takes up to 7 days. The extension ID, code and users carry over, and users are not notified — [Chromium extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/-x6LrspgArc); [ExtensionBooster guide](https://extensionbooster.net/blog/chrome-extension-ownership-transfer-sell-extension-security-guide/). These are secondary or forum sources; no official Google policy page on user notification was found.
- QuickLens was listed on the ExtensionHub marketplace two days after it was published, which suggests extensions are built partly to flip — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- Due-diligence guides for buying Chrome extension "businesses" exist (for example a 2026 guide from Flipagora), which shows a normalised resale market — [Flipagora](https://flipagora.com/en/blog/how-to-buy-a-chrome-extension-business); [FirstPassMemo](https://firstpassmemo.com/answers/how-to-buy-a-chrome-extension/)
- Developer testimony (HN, Mar 2024): offers with "insane numbers", some "for obviously nefarious purposes". One buyer wanted the Opera developer account credentials rather than a formal transfer, which would leave no visible ownership change. A copied open-source extension was resold "for 5 figures" — [Hacker News thread on under-new-management](https://news.ycombinator.com/item?id=39620060)
- **Mellowtel monetisation SDK (Jul 2025):** Tuckner found the library in 245 extensions (45 Chrome, 129 Edge, 71 Firefox) with about 900,000 users (other coverage says over 1M). It turns browsers into a scraping network that sells bandwidth to third parties including AI firms. It also collects IP and bandwidth data and removes CSP headers. Google removed 12 Chrome ones, while 121 Edge and 69 Firefox ones stayed active at the time — [Tuckner thread, 8 Jul 2025](https://threadreaderapp.com/thread/1942655985019150672); [PCWorld](https://www.pcworld.com/article/2845330/hundreds-of-chrome-extensions-create-a-web-scraping-botnet.html); [CyberInsider](https://cyberinsider.com/one-million-devices-entraped-by-mellowtel-powered-scraping-botnet/). Mellowtel says the data sharing is opt-in.
- Data-broker monetisation: Urban VPN's publisher is affiliated with BiScience. AI chat harvesting was disclosed in the privacy policy as marketing analytics — [The Register](https://www.theregister.com/2025/12/16/chrome_edge_privacy_extensions_quietly/)
- Affiliate injection: ShadyPanda's 2023 phase put tracking codes on eBay and Amazon links across 145 extensions — [Hackread](https://hackread.com/shadypanda-attack-spied-chrome-edge-users/)
- Secure Annex (founded Nov 2024 by Tuckner) was acquired by Socket on 28 Apr 2026 — [Socket](https://socket.dev/blog/socket-acquires-secure-annex)

### Inferences
- With transfer at $5 and purchases starting around $50, an install base is worth far more to someone who will monetise it covertly than to an honest developer. Small extensions (QuickLens at 7k, ShotBird at 800) are worth buying for targeted payloads like ClickFix and credential capture.
- Monetisation SDKs are a reputation-independent risk. A well-reviewed extension can embed Mellowtel or similar code without any ownership change, so code-level SDK fingerprinting matters as much as publisher history.
- Credential-sale purchases, as opposed to formal transfers, defeat publisher-change detection entirely.

### Gaps
- No reliable source for price per user. CyberScoop and the HN thread both lack per-user figures, and broker listing prices were not collected in this pass.
- The full text of Tuckner's buying-extensions post could not be retrieved, so its details about brokers and offers are missing.

## 3. Which reputation signals exist and how reliable they are

### Takeaway
Most visible reputation signals are weak or gameable. Ratings do not separate malware from benign extensions, reviews can be bought for about $1 each, user counts can be inflated, and badges reflect a one-time check that survives later changes. The signals with real predictive value are about the publisher and change history: developer track record (publishers with one malware extension tend to have more), publisher-field changes, sudden updates after a long quiet period or right after a transfer, code similarity to known-bad clusters, and SDK or remote-code indicators.

### Cited Findings
- **Ratings:** in the CCS 2024 Stanford study (data mostly to mid-2023), median ratings were about 5 for benign, 4.997 for malware and 4.571 for vulnerable extensions. "Users don't give SNE lower ratings, so ratings aren't a useful warning signal." Being unrated is more common for malware (52.12%) than for benign (31.52%) — [Hsu, Tran, Fass, "What is in the Chrome Web Store?", arXiv 2406.12710 / CCS 2024](https://arxiv.org/html/2406.12710v1)
- **User counts:** mean users were about 27k for malware versus about 11k for benign. 25% of malware extensions have over 5k users, against a 75th percentile of 220 for benign ones. High user counts are therefore not reassuring and may correlate with malicious intent. Over 346M users installed a security-noteworthy extension (SNE) over 3 years (not deduplicated) — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1)
- **Time in store:** malware stays on average 380 days (lower bound). "TeleApp" stayed 3,105 days before malware was found. Age or longevity is therefore not proof of safety — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1)
- **Developer history (strongest signal):** developers with one malware extension publish about 4.9 more on average. 30 developers each have over 100 malware extensions, and one had 1,041 removed with 434 still listed. 321 code-similarity clusters contain only SNE — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1)
- **Update cadence:** 59.5% of extensions had never been updated (Feb 2023), and the median number of updates after one year is 0. Updated extensions average 30,708 users against 1,974 for never-updated ones — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1). Combined with the case studies, a dormant extension that suddenly updates is notable (RedDirection: clean "for years").
- **Fake reviews:** Matt Frisbie bought fake reviews at $1 each from a vendor who scraped new listings and offered up to 1,000. The reviews stayed visible. "Google does not verify review authenticity" — [Frisbie, 4 Mar 2024](https://mattfrisbie.substack.com/p/lets-buy-some-fake-chrome-extension). The FakeX academic framework (AsiaCCS 2024) found that fake reviewers use fake accounts, disjoint account sets per extension, automation, and focus on reviews over ratings — [Chalmers, FakeX](https://www.cse.chalmers.se/~andrei/asiaccs24.pdf)
- **Search and listing manipulation:** Palant identified 920 extensions stuffing keywords into rarely read language descriptions to game Chrome Web Store search. His Jan 2025 "Chrome Web Store is a mess" post argues enforcement is loose — [TechSpot](https://www.techspot.com/news/106274-chrome-extensions-abusing-google-lousy-security-policies-come.html); [MalwareTips summary of almost.secure](https://malwaretips.com/threads/almost-secure-blog-chrome-web-store-is-a-mess.134446)
- **Established Publisher badge:** granted automatically when identity is verified and there is "a consistent positive track record with Google services and compliance." **Featured badge:** manual review for best practices, UX and up-to-date APIs; the developer must own the extension when nominating; badges cannot be bought — [Chrome for Developers, Discovery on the Chrome Web Store](https://developer.chrome.com/docs/webstore/discovery)
- Badges failed in practice: Geco (Featured and verified), Clean Master (Featured and Verified), Urban VPN (Featured) and ShotBird (Featured) — see Section 1 sources.
- **Ownership-change visibility:** the publisher name on the listing changes after a transfer, while the new owner's email can stay hidden until changed. The extension ID stays the same — [ExtensionBooster](https://extensionbooster.net/blog/chrome-extension-ownership-transfer-sell-extension-security-guide/). The QuickLens transfer was visible as a new contact address (`support@doodlebuggle.top`) on the listing — [The Hacker News](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- **Detection tooling:** "under-new-management" (classvsoftware / Matt Frisbie, Mar 2024) polls developer metadata hourly through the ExBoost API and badges extensions whose owner changed. Commenters note that credential sales bypass it — [Hacker News](https://news.ycombinator.com/item?id=39620060)
- **Privacy policy:** Urban VPN's policy did disclose AI-chat collection, so a policy's existence is not reassurance. Policy content (data-broker affiliations, "marketing analytics", sharing clauses) is the useful part — [The Register](https://www.theregister.com/2025/12/16/chrome_edge_privacy_extensions_quietly/)

### Inferences
Suggested signal weighting for a vetting app, inferred from the evidence above:

| Signal | Reliability | Use |
|---|---|---|
| Star rating, review count | Low (no separation; $1 reviews) | Display only; flag review bursts or many 5-star reviews from new accounts |
| User count | Low as a safety signal; high as a target-value signal | Treat high counts as raising the stakes, not lowering risk |
| Featured / Established Publisher | Low to moderate; point-in-time, survives transfers | Minor positive at most; never let it override code findings |
| Publisher identity change (name, email, website domain) | High, when observable | Strong flag, especially with an update within about 30 days |
| Update after long dormancy | Moderate to high | Flag and diff |
| Developer's other extensions (any removed or malicious) | High | Strong negative; cluster by publisher and by code similarity |
| Code similarity to known-bad clusters | High | Strong negative |
| Monetisation SDK or remote-code patterns (Mellowtel, polling-fetched JS, CSP header stripping) | High | Strong negative regardless of reputation |
| Developer domain age and website | Moderate | New or throwaway domains (for example `.top`) on a contact email after a change are a flag |
| Open-source repo | Moderate; repo may not match the store build | Verify the build matches the repo; a public repo with a closed store build is a flag |
| Privacy policy | Low by existence; moderate by content | Parse for data-broker or "analytics" sharing |
| Last-update date | Ambiguous (stale means vulnerable; fresh can mean weaponized) | Combine with diff |

- A vetting app should snapshot publisher name, contact email, website, privacy-policy URL, version and permission set for every extension it vets, then alert on diffs. The store does not provide history, so the app must build it.

### Gaps
- No peer-reviewed study found that quantifies ownership transfers in the Chrome Web Store or links them to malware rates.
- No data found on how often fake user installs are bought or what they cost (Frisbie's vendor sold 50 "users" but did not price them separately).
- Whether Google revokes Featured or Established badges on transfer is not documented. The ShotBird case implies it does not.

## 4. Does high reputation reduce risk or create targets, and what do experts recommend?

### Takeaway
High reputation makes an extension a more valuable target: more users to monetise, more trust to exploit, and badges that lower suspicion. Evidence does not show that reputation reduces the risk of future malicious updates. Experts converge on treating every update as a new install request, watching for ownership changes, diffing versions, and controlling updates in managed environments.

### Cited Findings
- Tuckner (Annex): a "'Featured,' reviewed, functional extension changes hands, and the new owner pushes a weaponized update to every existing user." — [The Hacker News, Mar 2026](https://thehackernews.com/2026/03/chrome-extension-turns-malicious-after.html)
- Koi on RedDirection: the malicious versions "auto-installed silently for over 2.3 million users." Geco was "a carefully crafted Trojan horse," not "some obvious scam extension" — [The Register](https://www.theregister.com/security/2025/07/08/browser-hijacking-campaign-infects-23m-chrome-edge-users/1236258)
- Store review focuses on initial submission rather than ongoing behaviour (Trey Ford). Randolph Barr: "the patience" of the attackers matters as much as the technique — [Hackread](https://hackread.com/shadypanda-attack-spied-chrome-edge-users/)
- The Stanford study recommends vetting updates "since benign extensions can turn malicious," scrutinising developers with prior SNE, and flagging code clones of known SNE — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1)
- Enterprises often restrict admin rights but overlook the browser, so employees can install anything. Extensions are "easy to install and hard to remove" — [CyberScoop](https://cyberscoop.com/browser-extension-sales-permissions-hidden-threat/)
- Cyberhaven shows a reputable, verified security vendor's account being hijacked by an OAuth phish — [LayerX](https://layerxsecurity.com/blog/attack-campaign-targeting-browser-extensions); [SOCRadar](https://socradar.io/blog/phishing-attack-cyberhaven-chrome-extension/)
- Mean users for malware extensions (about 27k) exceed benign ones (about 11k) — [arXiv 2406.12710](https://arxiv.org/html/2406.12710v1)

### Inferences
- Reputation tells you something about the current owner and the current code. It says almost nothing about the next update. A vetting result should therefore be pinned to a version and a publisher snapshot and expire when either changes.
- Recommended practice for the app: re-vet on every version change; show a diff of permissions, host permissions, content-script matches, remote endpoints and new third-party libraries; raise severity when an ownership change and an update coincide; and treat remote-code patterns (fetch then execute, `onload` injection, CSP or X-Frame-Options stripping) as critical whatever the badges say.
- For consumers without enterprise policy, the realistic mitigation is alerting (owner changed, update arrived, new endpoints) plus a quick disable, since Chrome does not let a normal user pin versions.

### Gaps
- No quantitative study found comparing malicious-update rates for high- and low-reputation extensions.

## 5. Can enterprises pin versions or block auto-updates (Chrome, Edge)? Trade-offs

### Takeaway
Yes, in managed Chrome. Admins can pin a force-installed extension to a version in the Admin console, or self-host a reviewed CRX and use `ExtensionSettings` with `override_update_url` so Chrome takes updates only from the enterprise server. `minimum_version_required` blocks old versions. The trade-off is that pinned or forked extensions miss security fixes and need an internal review pipeline. Edge supports the same `ExtensionSettings` family, but its pinning specifics were not verified here.

### Cited Findings
- In the Google Admin console, admins can select the required version for an organisational unit. "When an extension is pinned, Chrome will not update it beyond that specified version." — search excerpt from [Chrome for Developers, Extension update lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle) / [Chrome Enterprise help](https://support.google.com/chrome/a/answer/7532015?hl=en)
- Self-hosting forks: the `ExtensionSettings` policy with `override_update_url: true` makes Chrome use the `update_url` in the policy, or the `ExtensionInstallForcelist` URL, for later updates instead of the manifest's URL. `update_url` applies only to `force_installed` and `normal_installed`. For self-hosting, the policy points at the URL of the packed `.crx`. The Chrome Web Store update URL is `https://clients2.google.com/service/update2/crx` — [Chrome Enterprise help, Set Chrome app and extension policies (Windows)](https://support.google.com/chrome/a/answer/7532015?hl=en); [Configure ExtensionSettings policy](https://support.google.com/chrome/a/answer/9867568?hl=en)
- `minimum_version_required` disables extensions, including force-installed ones, older than a given version, which lets admins force past a known-bad build — [Chrome for Developers, update lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle)
- Updates are automatic and silent by default for unmanaged users. A prompt appears only for new permissions — [CyberScoop](https://cyberscoop.com/browser-extension-sales-permissions-hidden-threat/)

### Inferences
- **Pinning pros:** it would have blocked Cyberhaven v24.10.4, Geco's update, QuickLens's 17 Feb update and Clean Master's mid-2024 update, provided the pinned version was clean.
- **Pinning cons:** missed security fixes (the Stanford study found 42% of known-vulnerable extensions still unpatched two years after disclosure, so many have no fixes anyway). It is also an operational burden: someone must review each new version before un-pinning. And it does not stop remote-code payloads in a pinned version that already fetches and runs server code (QuickLens-style runtime JS). So pinning must be paired with code review that flags remote-code capability.
- **Self-hosted CRX:** gives full control and auditability (diff before publishing internally), but the enterprise becomes the maintainer and must also handle the extension's server-side dependencies.
- A vetting app that serves enterprises can output policy fragments (allowlist with pinned versions, `minimum_version_required`, blocklist) and a re-review queue triggered by store version changes.

### Gaps
- Edge-specific pinning (Edge Management Service or `ExtensionSettings` in Edge) was not confirmed from Microsoft documentation in this pass. Edge supports `ExtensionSettings`, but version pinning details are unverified.
- Whether a pinned extension keeps working if Google removes it from the store, or remotely disables it as with The Great Suspender, is not documented in the sources fetched.
- Firefox enterprise policy equivalents were not researched.
