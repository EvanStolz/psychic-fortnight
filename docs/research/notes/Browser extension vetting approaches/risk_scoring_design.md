# Risk scoring design for browser extension vetting

Research notes, current as of 2026-10-29. Scope: how extension risk is scored and presented today, lessons from analogous security scores, and what makes a rating intuitive and trustworthy for small-to-medium IT reviewers deciding approve/deny on extension requests.

Note on source quality: most extension-vendor scoring details are not publicly documented. Several findings come from vendor blogs, competitor marketing or third-party summaries; this is flagged inline. CRXcavator's own docs (crxcavator.io/docs) could not be fetched (site offline, Wayback Machine blocked for this tool), so its methodology is reconstructed from secondary sources.

## 1. How existing extension tools score risk (scales, inputs, weighting)

### Takeaway
There is no common scale: tools use an uncapped points sum (CRXcavator), 0-100 (Spin.AI), 0-10 (LayerX), points-to-tier bands (Delinea) or pure categorical levels driven by the worst permission (Microsoft Defender). Nearly all vendors ultimately collapse to 3-5 named tiers (Low/Medium/High/Critical), and almost none disclose weights, so the tier, not the number, is what admins act on.

### Cited Findings

**CRXcavator (Duo / Cisco)**
- Total risk score was the sum of component scores: CSP, RetireJS, metadata, webstore and permissions — [Kolide/Cartography CRXcavator schema](https://lyft.github.io/cartography/modules/crxcavator/schema.html) (via search summary); a Wayfair scanner that reimplemented it summed sections "ignoring External metadata & WebStore" while still counting RetireJS — [wayfair-incubator README](https://github.com/wayfair-incubator/malicious-chrome-extension-scanner/blob/master/README.md)
- Components were added "no normalization, no weighting, no ceiling" (uncapped total); the score "measured risk surface, not malicious intent", so a broad-permission password manager could outrank a narrowly scoped credential stealer — [Am I Being Pwned blog (competitor vendor, 2026)](https://amibeingpwned.com/blog/crxcavator-alternatives)
- Same vendor claims, from its own test of 2,534 extensions, that the median permission score of extensions it rated CRITICAL was lower than that of extensions rated CLEAN, i.e. permission score was "uncorrelated" with maliciousness (vendor claim, unverified) — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives)
- A PowerShell module maps CRXcavator totals to tiers: Low <= 377, Medium 378-478, High > 478 (no Critical tier; origin of cutoffs not explained); an example total of 644 shows as High — [BrowserExtensionRisk.psm1, PowerShell Gallery](https://www.powershellgallery.com/packages/BrowserExtensionRisk/0.0.1/Content/BrowserExtensionRisk.psm1)
- CRXcavator went offline in 2024 — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives); also stated by [DEV Community, 2026](https://dev.to/nexgendata/crxcavator-is-dead-heres-how-to-audit-chrome-extensions-in-2026-3n7m) (not verified from a primary source)

**Spin.AI / SpinOne / SpinCRX**
- Provides a score out of 100, evaluating 15+ factors across business, security and compliance risk; integrated into Chrome Browser Cloud Management in 2023 — [Help Net Security, 2023-05-03](https://www.helpnetsecurity.com/2023/05/03/spin-ai-google/); [Help Net Security, 2023-04-25](https://www.helpnetsecurity.com/2023/04/25/risk-assessment-chrome-extensions/)
- Vendor-sourced: ML over 15+ attributes, sandbox runtime analysis, flags AI-enabled extensions that may send data to LLMs, daily rescanning, 550,000+ assessed apps/extensions; weights and thresholds not disclosed — [Decryption Digest buyer's guide, 2026-08-01](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai)
- Google's admin help maps Spin.AI scores as Low 1-34, Medium 35-64, High 65-100 (higher = riskier) — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en). CONFLICT: Help Net Security calls it a "safety score out of 100" and a search summary of the same Google table described the scale as reversed (100-66 low). The direct fetch of Google's page showed higher = riskier. The direction ambiguity itself is a usability lesson.

**LayerX (Extensionpedia)**
- Categorical levels low/medium/high/critical; inputs include access to passwords, cookies, user input, form fields, plus developer reputation, downloads, ratings, extension age; can score before install; weights undisclosed — [Decryption Digest, 2026](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai)
- In Chrome Enterprise, LayerX scores are 0-10: Low 0-3.9, Medium 4-6.9, High 7-10 (note scores 3.1-3.9 "might temporarily appear as medium risk" in the console) — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en)
- A search-result title indicates "Akamai acquires LayerX" — [layerxsecurity.com](https://layerxsecurity.com/blog/layerx-joins-forces-with-google-chrome-enterprise-to-stop-malicious-browser-extensions/) (title only; not verified)

**Chrome Enterprise (Google Admin console)**
- Scores are third-party (Spin.AI, LayerX) shown under Devices > Chrome > Reports > Apps & extensions usage; "Google makes no guarantee about the data provided by third-party companies"; "there might be instances where a risk assessment score is not available"; only public Chrome Web Store extensions are assessed — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en)
- Note that Google normalizes two providers' different scales (0-10, 0-100) into the same Low/Medium/High bands in the console — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en)
- Google announced admins would be able to set risk thresholds to automatically block extensions based on Spin.AI/LayerX assessments (shipping status unconfirmed) — [TechRadar](https://www.techradar.com/pro/security/google-wants-to-give-it-admins-more-control-over-what-chrome-extensions-you-use-at-work)

**Microsoft Defender Vulnerability Management**
- Extension-level risk is "the highest risk level generated by the browser extension", values None/Low/Medium/High/Critical (a max-of-permissions rule) — [Microsoft Learn, DeviceTvmBrowserExtensionsKB](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicetvmbrowserextensionskb-table) (via search summary)
- UI shows "Requested permissions" count and "Permissions risk" columns; per-permission risk "is based on the type of access the permission is requesting"; flyout shows whether each permission is optional; a versions tab; and the explicit disclaimer "Risk is subjective. Each organization should determine the types of risk they're willing to take on." — [Microsoft Learn, Browser extensions assessment (updated 2026-08-11)](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions)

**Delinea Privilege Manager (a fully documented, transparent example)**
- "Score = Permission Points + Modifiers". Example points: `<all_urls>` 30, `debugger` 30, `webRequest`+`webRequestBlocking` 25 (webRequest alone 10), `nativeMessaging`/`management`/`proxy` 20, `cookies`/`clipboardRead` 15, `tabs`/`history`/`downloads` 10, `activeTab`/`bookmarks` 5, `storage`/`alarms` 0; unknown permissions 0 — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Modifiers: sideloaded +20, developer mode +20, not from official store +10, enterprise-deployed -10, confirmed AI +10, suspected AI +5, Manifest V2 +5. Bands: Low 0-15, Medium 16-35, High 36-60, Critical 61+ — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Delinea states Critical does not mean malicious (password managers, ad blockers land there); in a 60-extension sample: Low 9, Medium 14, High 18, Critical 19 (i.e., the top tier was the most populated) — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Delinea's own worked example is internally inconsistent (text says enterprise deployment lowers a score to 10/Low, table shows 20/Medium) — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)

**Koi Security (ExtensionTotal / Koidex)**
- Koidex reportedly produces a multi-dimensional score expressed as Low/Medium/High/Critical with a readable summary; methodology described as proprietary — [makerstack review (third party)](https://makerstack.co/reviews/koidex-review/)
- Koi exposes a risk API at app.extensiontotal.com; scoring not documented — [API Evangelist listing](https://apis.apievangelist.com/store/koi-security-risk-api/)

**Secure Annex / Socket**
- Socket acquired Secure Annex on 2026-04-28; Secure Annex features migrating into Socket, extending coverage to browser extensions, IDE extensions, MCP servers — [Socket blog](https://socket.dev/blog/socket-acquires-secure-annex); [BankInfoSecurity](https://www.bankinfosecurity.net/socket-buys-secure-annex-to-expand-supply-chain-visibility-a-31562)
- Secure Annex was used in a Tines workflow to enrich Chrome Enterprise extension install requests with metadata, code review and "a summary of the risk the extension presents" — [Tines library](https://www.tines.com/library/stories/1273152/)
- Socket's package model: five separate 0-100 scores (Supply Chain Security, Vulnerability, Quality, Maintenance, License) plus typed alerts (malware, install scripts, obfuscation, typosquatting) — [developer-tech.com, 2026](https://www.developer-tech.com/news/socket-security-analysis-on-npm-shield-for-supply-chains/); a downstream lint tool treats only the security axes as blocking and prints quality/maintenance/license "purely as context" — [react.doctor docs](https://www.react.doctor/docs/rules/socket/low-supply-chain-score)

### Inferences
- The market has converged on 4 categorical tiers as the actionable output even when a number exists underneath; numbers are mostly used for sorting.
- Permission-only scores (CRXcavator, Delinea, MDVM) measure capability/attack surface, not intent. They predictably push popular legitimate tools (password managers, ad blockers) to the top tier, which causes alert fatigue and erodes trust unless paired with reputation/behavior signals.
- Delinea is the best public template for explainability: a lookup table of points per permission plus named modifiers lets a reviewer reproduce the score by hand.
- Inconsistent scale direction across tools (safety vs risk; Google flips none of them visibly) argues for labeling the direction explicitly or avoiding raw numbers in the primary UI.

### Gaps
- Island, Incydr (Code42/Mimecast) and Secure Annex's pre-acquisition scoring method: no public methodology found in the searches run.
- Exact CRXcavator per-permission and CSP point values could not be retrieved (official docs offline; Wayback blocked).
- Whether Chrome's admin-set auto-block thresholds shipped by Oct 2026 was not confirmed.
- ExtensionTotal/Koi weighting not public.

## 2. Analogous scoring systems and lessons

### Takeaway
Mature security scores have moved toward (a) labeling what a number does and does not include, (b) per-check breakdowns beneath an aggregate, and (c) explicit admission that scores are heuristic. The big recurring failure is a single severity number being treated as "risk" and used as the sole gate.

### Cited Findings
- CVSS v4.0 qualitative scale: None 0.0, Low 0.1-3.9, Medium 4.0-6.9, High 7.0-8.9, Critical 9.0-10.0 — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)
- CVSS v4 introduced nomenclature CVSS-B / BT / BE / BTE so "numerical CVSS scores should be labeled using nomenclature that communicates the metrics used in its generation"; unassessed metrics default to Not Defined — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)
- CVSS v4 scores come from expert ranking of ~15 million vectors grouped into 270 equivalence sets (MacroVectors) with a lookup table plus interpolation, not a closed-form formula — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)
- Base score "reflects the severity of a vulnerability according to its intrinsic characteristics"; business factors are "outside the scope of CVSS" — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)
- Critique: the v3.1 spec has a section "CVSS Measures Severity Not Risk", yet risk prioritization is its primary real-world use — [Spring, Hatleback et al., "CVSS: Ubiquitous and Broken", ACM DTRAP](https://dl.acm.org/doi/fullHtml/10.1145/3491263)
- Critique of v4: longer vectors and contradictory calculations make it harder to use — [scip AG labs, 2024](https://www.scip.ch/en/?labs.20240314=); Red Hat: "CVSS does not equal risk" — [Red Hat blog](https://www.redhat.com/en/blog/why-cvss-does-not-equal-risk-how-think-about-risk-your-environment); v3.1 and v4.0 scores are not directly comparable — [Snyk Learn](https://learn.snyk.io/lesson/what-is-cvss/)
- EPSS paper notes CVSS Base score is not meant to reflect overall risk but is misinterpreted as such; EPSS instead estimates probability of exploitation — [Jacobs et al., EPSS, arXiv](https://arxiv.org/pdf/1908.04856)
- OWASP Risk Rating: factors scored 0-9; <3 LOW, 3-<6 MEDIUM, 6-9 HIGH; likelihood and impact tiers combined through a matrix (HIGH impact: Medium/High/Critical across likelihood; MEDIUM impact: Low/Medium/High); base model "assumes that all the factors are equally important"; use business impact over technical impact when available; a customizable framework "is critical for adoption"; tune by comparing model output to expert ratings — [OWASP Risk Rating Methodology](https://community.owasp.org/OWASP_Risk_Rating_Methodology)
- OpenSSF Scorecard: aggregate 0-10 is "a weight-based average of the individual checks weighted by risk" with Critical=10, High=7.5, Medium=5, Low=2.5; "The checks themselves are heuristics; there are false positives and false negatives"; "Aggregate scores in particular tells you nothing about what individual behaviors a repository is or is not doing" — [OpenSSF Scorecard README](https://github.com/ossf/scorecard/blob/main/README.md)
- Scorecard per-check scores use tiered partial credit (e.g., Branch-Protection tiers 3/6/8/9/10) and some checks return inconclusive results — [OpenSSF Scorecard checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- SecurityScorecard: 0-100 mapped to A (90-100), B (80-89), C (70-79), D (60-69), F (<60); 10 factor scores each 0-100, where 100 = no issues found — [SecurityScorecard methodology white paper](https://securityscorecard.com/white-paper/securityscorecards-scoring-methodology); [SecurityScorecard support](https://support.securityscorecard.com/hc/en-us/articles/8366223642651)
- BitSight: 250-900 scale, effective range 300-820, tiers Advanced 740-900 / Intermediate 640-730 / Basic 250-630 — [BitSight help](https://help.bitsighttech.com/hc/en-us/articles/231352528) (via search summary)
- Mozilla HTTP Observatory: baseline then itemized bonuses/penalties, min 0, max currently 145, mapped to letter grades; its scoring doc says grade ranges and modifiers are "essentially arbitrary, based on industry feedback" — [MDN Observatory scoring](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring); [mozilla/http-observatory scoring.md](https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md)
- Socket: multiple 0-100 sub-scores plus typed alerts rather than one number (see section 1) — [developer-tech.com](https://www.developer-tech.com/news/socket-security-analysis-on-npm-shield-for-supply-chains/)

### Inferences
- Itemized modifiers (Observatory, Delinea) and per-check breakdowns (Scorecard, SecurityScorecard factors) are the dominant explainability pattern: show the line items that produced the result.
- CVSS v4's nomenclature idea transfers directly: label a score with what was actually analyzed (e.g., "permissions only" vs "permissions + code + reputation") so a partial analysis is not mistaken for a full one.
- The OWASP admission that equal weighting is the default and that tuning should be checked against expert judgment suggests calibrating any extension score against the IT team's own past approve/deny decisions.
- Letter grades (A-F) are "higher is better" (safety) framing; risk tiers are "higher is worse". Mixing both in one app would confuse; pick one direction.

### Gaps
- No primary source found quantifying false precision in CVSS v4 (e.g., rater disagreement studies for v4); older literature on v3 inter-rater variability was not retrieved in this pass.
- VirusTotal detection-ratio presentation was not researched in this pass (known pattern: "N/M engines flagged" shown as a ratio rather than a score; no source fetched).

## 3. Research on false precision, numeric vs categorical communication, alert fatigue and decision-support UI

### Takeaway
Evidence is mixed: verbal labels are interpreted more variably than numbers, but precise numbers convey unwarranted certainty when the underlying model is heuristic. For security reviewers, the strongest evidence concerns false positives: noisy high ratings cause desensitization and mistrust, so a rating's credibility depends on rarely crying wolf.

### Cited Findings
- SOC study (21 practitioners, 7 SOCs): false-positive burden leads to alarm desensitization, mistrust and reduced responsiveness; validating alarms is manual, multi-factor work — [Alahmadi, Axon, Martinovic, "99% False Positives", USENIX Security 2022](https://www.usenix.org/conference/usenixsecurity22/presentation/alahmadi); [Oxford abstract](https://www.cs.ox.ac.uk/publications/publication14673-abstract.html)
- Cybersecurity risk communication can be numeric, verbal or visual, each with trade-offs; verbal terms ("possible", "unlikely") vary widely across individuals; "vague and unspecific risk information may increase anxiety and not risk awareness" — [Nurse, Creese, Goldsmith, Lamberts, "Trustworthy and Effective Communication of Cybersecurity Risks: A Review", STAST 2011](https://www.cs.ox.ac.uk/files/6636/STAST2011_NCGL_authors_final.pdf)
- Randomized survey (n=939): verbal descriptors produced less accurate, more variable and higher risk perceptions than numbers — [Healthcare 2023, PMC9914684](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9914684/)
- Meta-analysis: numbers also led to overestimation, but smaller (2-20%) than verbal labels — [BMC Med Inform Decis Mak 2014](https://link.springer.com/article/10.1186/1472-6947-14-76)
- Review: words and numbers convey uncertainty differently; precise numeric probabilities did not make national security officials riskier, and increased willingness to gather more information — [Trends in Cognitive Sciences 2022, "Communicating uncertainty using words and numbers"](https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(22)00060-2) (via search summary)
- OpenSSF explicitly warns aggregate scores hide which behaviors are present — [OpenSSF Scorecard README](https://github.com/ossf/scorecard/blob/main/README.md); Mozilla calls its grade bands "essentially arbitrary" — [mozilla/http-observatory scoring.md](https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md)
- Google displays a LayerX score of 3.1-3.9 that "might temporarily appear as medium risk" — a real example of boundary instability in banded numbers — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en)

### Inferences
- A 0-100 number implies 101 meaningful distinctions; heuristic extension scores (undisclosed weights, permission-driven) cannot support that resolution. Differences like 62 vs 66 invite over-reading and boundary disputes.
- The research favors pairing: a categorical decision label (what to do) plus the numbers/evidence that justify it (why), rather than either alone.
- Because Delinea's sample put the largest share of extensions in Critical, a permission-only top tier would be a high-false-positive alarm; the SOC study predicts reviewers will learn to ignore it.

### Gaps
- No study found that directly tests 0-100 vs letter grade vs tier for IT approval decisions on software/extensions. Recommendations here are inferred from adjacent domains (health risk, SOC alerts, intelligence analysis).
- No usable-security research found specifically on extension permission warnings for admins (end-user permission warning research exists but was not retrieved).

## 4. Combining dimensions: single number vs sub-scores, max vs weighted sum, hard-fail rules

### Takeaway
Real systems split cleanly into additive capability scores (CRXcavator, Delinea, Scorecard) and worst-factor rules (Microsoft Defender's "highest risk level"). Additive sums let many minor items outvote one decisive item and conflate capability with intent; multi-axis designs (Spin.AI business/security/compliance, Socket five axes, SecurityScorecard factors) keep the dimensions visible, and gate only on the security axes.

### Cited Findings
- Additive, unweighted, uncapped sum (CRXcavator) measured "risk surface, not malicious intent" — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives)
- Additive points plus modifiers (Delinea), with install-source and AI modifiers added to the same number — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Worst-factor: MDVM extension risk = highest permission risk level — [Microsoft Learn KB table](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicetvmbrowserextensionskb-table)
- Weighted average by risk class (Scorecard: 10/7.5/5/2.5) — [OpenSSF Scorecard README](https://github.com/ossf/scorecard/blob/main/README.md)
- Matrix combination of likelihood and impact rather than multiplication (OWASP); SimpleRisk notes the OWASP method "diverged from the numbers and used a matrix of qualitative values" — [OWASP](https://community.owasp.org/OWASP_Risk_Rating_Methodology); [SimpleRisk](https://www.simplerisk.com/blog/owasp-risk-rating-methodology-and-simplerisk)
- Spin.AI separates business, security and compliance risk — [Help Net Security](https://www.helpnetsecurity.com/2023/04/25/risk-assessment-chrome-extensions/); Socket uses five axes with typed alerts (malware, obfuscation, install scripts) — [developer-tech.com](https://www.developer-tech.com/news/socket-security-analysis-on-npm-shield-for-supply-chains/); downstream gating only on security axes — [react.doctor](https://www.react.doctor/docs/rules/socket/low-supply-chain-score)
- Patents in the space: increase score for each critical/high permission; add points for missing developer email and low user counts — [US11468172B2](https://patents.google.com/patent/US11468172); [US20150007330](https://patents.justia.com/patent/20150007330) (via search summary)
- Proposed alternative to permission scoring: compare declared permissions vs APIs actually called in code, dynamic analysis of DOM/cookie access and outbound requests, human verification of serious findings (vendor) — [Am I Being Pwned](https://amibeingpwned.com/blog/crxcavator-alternatives)

### Inferences
- A defensible structure for the app: separate axes for (1) capability/permissions, (2) maliciousness/behavior signals, (3) reputation/publisher, (4) vendor/compliance, each with its own short tier; overall verdict computed by rules, not by summing axes.
- Use worst-factor (max) for decisive signals and additive/weighted only within an axis (e.g., permission points). This prevents a known-malicious flag from being diluted by good reputation, and prevents ten minor items from looking like one severe one.
- Hard-fail overrides (known malicious / on a blocklist, remote code loading, obfuscated code with network exfiltration, sideloaded/not from store) should force the verdict regardless of numeric score, and be shown as the named reason. Delinea's sideload/dev-mode modifiers show these are recognized signals, but as additive points they can be swamped.
- Reputation should modulate, not cancel, capability: a 10M-user password manager is still High capability but Low suspicion; showing both prevents the CRXcavator failure mode.

### Gaps
- No vendor publicly documents a hard-fail rule set for extensions; the hard-fail list above is an inference.
- No empirical comparison found of max vs weighted-sum aggregation for extension maliciousness detection.

## 5. Handling uncertainty/unknowns and score drift across versions

### Takeaway
Tools handle unknowns inconsistently: some silently treat unknowns as safe (Scorecard Branch-Protection without admin token; Delinea unknown permissions = 0 points), others give no credit (Scorecard on Azure DevOps), and Google simply shows no score. Drift is handled by rescanning (Spin.AI daily) and recomputing on manifest change (Delinea).

### Cited Findings
- Delinea: permissions not in the table contribute 0; scores update when an extension's manifest changes — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Scorecard: without an admin token, admin-only branch protection requirements are scored "as if all such requirements have been met"; on Azure DevOps unreadable controls "remain unknown" and get no Tier 1 credit; Code-Review returns "inconclusively" for bot-only changes; README sample shows "?" for some checks — [OpenSSF checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md); [OpenSSF README](https://github.com/ossf/scorecard/blob/main/README.md)
- Scorecard: "These scores change as we add new heuristics or refine the existing ones" (methodology drift) — [OpenSSF README](https://github.com/ossf/scorecard/blob/main/README.md)
- CVSS v4: unassessed metrics default to Not Defined and nomenclature (B/BT/BE/BTE) discloses which groups were assessed — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)
- Google: providers "try to assess most versions of an extension, but there might be instances where a risk assessment score is not available" — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en)
- Spin.AI (vendor claim): continuous daily rescanning re-flags extensions whose risk changes after an update or ownership change — [Decryption Digest](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai)
- MDVM exposes an "Extension versions" tab showing versions installed across the org — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions)
- Mozilla: modifiers "may change as baselines shift" — [MDN Observatory scoring](https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring)

### Inferences
- Unknown should be its own visible state ("Not analyzed" / "Could not analyze"), never 0 points. Obfuscated or unanalysable code is itself a risk signal and should at minimum route to manual review (fail-closed), consistent with Scorecard's "no credit for unknown" approach on Azure DevOps.
- Show coverage alongside the rating (CVSS nomenclature idea): which analyses ran on this version.
- Approvals should be pinned to a version (or manifest hash); a new version that adds permissions or host access, or a publisher change, should trigger re-review and show the delta (e.g., "+cookies, +<all_urls>; score 22 -> 48").
- Record the scoring-model version with each decision so historical approvals remain interpretable after weights change.

### Gaps
- No public detail found on how any extension vendor handles obfuscated/minified code in its score.
- No public data found on how often extension risk scores change between versions.

## 6. Tying scores to policy: auto-approve / review / deny and admin thresholds

### Takeaway
Vendors position scores as inputs to admin policy rather than verdicts, and the trend is toward admin-configurable thresholds (Google's planned auto-block). Documentation consistently disclaims that risk tolerance is organization-specific, which supports admin-set thresholds over a fixed global verdict.

### Cited Findings
- Microsoft: "Risk is subjective. Each organization should determine the types of risk they're willing to take on"; permission risk helps "decide whether to allow or block" — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions)
- Google planned admin-configurable risk thresholds to auto-block extensions based on Spin.AI/LayerX scores — [TechRadar](https://www.techradar.com/pro/security/google-wants-to-give-it-admins-more-control-over-what-chrome-extensions-you-use-at-work); Chrome Enterprise supports approval workflows for user extension requests — [Help Net Security](https://www.helpnetsecurity.com/2023/04/25/risk-assessment-chrome-extensions/)
- Outbrain uses Chrome Enterprise/Spin.AI risk scores to assist allow/block decisions — [Google Cloud blog, Outbrain case study](https://cloud.google.com/blog/products/chrome-enterprise/outbrain-taking-control-of-extension-security-with-chrome-enterprise)
- Delinea guidance: sort by score to prioritize review; use levels to guide allow/deny lists; many orgs allow vetted Critical extensions and block the rest; pair Critical with explicit approval; show auditors the permissions and modifiers behind each score — [Delinea docs](https://docs.delinea.com/online-help/privilege-manager/computer-groups/policies/browser-extensions/bem-risk.htm)
- Tines + Secure Annex workflow enriches incoming Chrome Enterprise extension requests with risk summary before a human decides — [Tines library](https://www.tines.com/library/stories/1273152/)
- Socket-based lint gates only on security axes, other axes as context — [react.doctor](https://www.react.doctor/docs/rules/socket/low-supply-chain-score)
- OWASP: customizable framework "is critical for adoption"; tune against expert ratings — [OWASP](https://community.owasp.org/OWASP_Risk_Rating_Methodology)
- CVSS: qualitative ratings are optional and scores should be combined with environment/business factors outside CVSS — [FIRST CVSS v4.0 spec](https://www.first.org/cvss/v4.0/specification-document)

### Inferences
- For SMB IT teams, a three-outcome policy maps cleanly: Auto-approve (all axes low, no hard-fail, on allow list or below threshold), Review (anything in between or any unknown), Deny (hard-fail or above deny threshold). Defaults should be conservative, with thresholds editable per org.
- Thresholds are easier for admins to set against tiers or a coarse scale than against 0-100 fine distinctions; if a number is kept, thresholds should snap to band edges.
- Every auto-decision should log the rule that fired ("Denied: on known-malicious list") for auditability; Delinea's "show auditors the permissions and modifiers" is the precedent.

### Gaps
- No public data found on what thresholds SMB teams actually set, or on auto-approve rates in practice.
- Shipping status of Google's threshold-based auto-block in Oct 2026 not confirmed.

## Overall answer: 0-100 vs letter grade vs tiers vs verdict (synthesis of the above)

### Takeaway
Evidence favors a verdict/tier as the primary output (what to do), backed by a small, reproducible points breakdown per axis (why), rather than a headline 0-100. A 0-100 implies precision that undisclosed, heuristic, permission-driven models cannot support, and the industry itself collapses scores to 3-5 tiers for action.

### Cited Findings
- Industry outputs collapse to tiers: Google maps 0-10 and 0-100 provider scores to Low/Medium/High — [Google Chrome Enterprise Help](https://support.google.com/chrome/a/answer/10836225?hl=en); MDVM None-Critical — [Microsoft Learn](https://learn.microsoft.com/en-us/defender-vulnerability-management/tvm-browser-extensions); LayerX and Koidex Low-Critical — [Decryption Digest](https://www.decryptiondigest.com/blog/browser-extension-risk-scoring-layerx-vs-spinai), [makerstack](https://makerstack.co/reviews/koidex-review/)
- Aggregates hide behaviors; checks are heuristics — [OpenSSF README](https://github.com/ossf/scorecard/blob/main/README.md); grade bands "essentially arbitrary" — [mozilla scoring.md](https://github.com/mozilla/http-observatory/blob/main/httpobs/docs/scoring.md)
- Verbal labels alone are interpreted variably; numbers are less variable — [PMC9914684](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9914684/); [Nurse et al. 2011](https://www.cs.ox.ac.uk/files/6636/STAST2011_NCGL_authors_final.pdf)

### Inferences
- Recommended presentation: Verdict (Approve / Review / Deny) + per-axis tier (e.g., Capability High, Behavior Low, Reputation Low, Vendor Unknown) + line-item math (e.g., `cookies 15 + <all_urls> 30 + tabs 10 = 55`). Hard-fail reasons shown by name above everything else.
- If a single number is retained for sorting, use a small integer points total within an axis (Delinea-style, reproducible by hand) rather than a normalized 0-100 composite; label direction explicitly ("risk points, higher is worse").
- Letter grades suit safety/posture framing (SecurityScorecard, Observatory) but invert the risk direction used by every extension tool reviewed; they also add a second mapping step for reviewers. Not recommended here.
- Calibrate tiers against the team's own historical decisions (OWASP guidance) and track how often each tier is overridden; a tier overridden most of the time is miscalibrated.

### Gaps
- No direct user study of IT reviewers comparing these formats; this synthesis relies on analogous-domain evidence and vendor practice.
