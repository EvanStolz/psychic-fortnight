import JSZip from 'jszip';

export interface PermissionInfo {
  permission: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
}

export interface Vulnerability {
  id: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  score?: number;
}

export interface ReputationData {
  publisher: string;
  rating: number;
  ratingCount: number;
  userCount: string;
  lastUpdated: string;
  isFeatured?: boolean;
  isVerifiedPublisher?: boolean;
}

export interface ReputationBreakdown {
  publisher: number;
  rating: number;
  ratingCount: number;
  users: number;
  updated: number;
  badges: number;
}

export interface ObfuscationTrigger {
  type: string;
  description: string;
  files: string[];
}

export interface AnalysisResult {
  name: string;
  version: string;
  icon?: string;
  manifestVersion: number;
  permissions: PermissionInfo[];
  apiCalls: string[];
  secrets: string[];
  dependencies: string[];
  vulnerabilities: Vulnerability[];
  cvssScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  safetyScore: number;
  riskEquation: string;
  isObfuscated: boolean;
  obfuscationScore: number;
  obfuscationTriggers: ObfuscationTrigger[];
  reputation?: ReputationData;
  reputationScore?: number;
  reputationBreakdown?: ReputationBreakdown;
  reputationEquation?: string;
}

// ─── Comprehensive CVE Database ─────────────────────────────────────────────
// Each entry maps a normalised library key to its known keywords (used for
// both filename and content-based detection) and the relevant CVEs.
interface CveEntry {
  keywords: string[];
  cves: Vulnerability[];
}

const CVE_DATABASE: Record<string, CveEntry> = {
  jquery: {
    keywords: ['jquery'],
    cves: [
      { id: 'CVE-2020-11022', severity: 'Medium', score: 6.1, description: 'XSS via jQuery.htmlPrefilter in jQuery < 3.5.0.' },
      { id: 'CVE-2020-11023', severity: 'Medium', score: 6.1, description: 'XSS via option elements in jQuery < 3.5.0.' },
      { id: 'CVE-2019-11358', severity: 'Medium', score: 6.1, description: 'Prototype pollution via $.extend in jQuery < 3.4.0.' },
    ],
  },
  lodash: {
    keywords: ['lodash'],
    cves: [
      { id: 'CVE-2020-8203',  severity: 'High',     score: 7.4, description: 'Prototype pollution in lodash merge/zipObjectDeep.' },
      { id: 'CVE-2019-10744', severity: 'Critical',  score: 9.1, description: 'Prototype pollution in lodash defaultsDeep < 4.17.12.' },
    ],
  },
  moment: {
    keywords: ['moment'],
    cves: [
      { id: 'CVE-2022-24785', severity: 'High', score: 7.5, description: 'Path traversal in moment.js locale loading < 2.29.2.' },
      { id: 'CVE-2022-31129', severity: 'High', score: 7.5, description: 'ReDoS in moment.js date parsing < 2.29.4.' },
    ],
  },
  axios: {
    keywords: ['axios'],
    cves: [
      { id: 'CVE-2023-45857', severity: 'Medium', score: 6.5, description: 'CSRF bypass in axios < 1.6.0 via cross-site request headers.' },
      { id: 'CVE-2021-3749',  severity: 'High',   score: 7.5, description: 'ReDoS in axios via crafted content-type header < 0.21.3.' },
    ],
  },
  bootstrap: {
    keywords: ['bootstrap'],
    cves: [
      { id: 'CVE-2019-8331',  severity: 'Medium', score: 6.1, description: 'XSS in Bootstrap tooltip/popover data-template attribute < 4.3.1.' },
      { id: 'CVE-2018-14042', severity: 'Medium', score: 6.1, description: 'XSS in Bootstrap data-container attribute in 3.x / 4.x.' },
    ],
  },
  angular: {
    keywords: ['angular', 'angularjs'],
    cves: [
      { id: 'CVE-2023-26116', severity: 'Medium', score: 5.3, description: 'ReDoS via aliases in AngularJS < 1.8.3.' },
      { id: 'CVE-2022-25869', severity: 'Medium', score: 6.1, description: 'XSS via DOM clobbering in AngularJS.' },
    ],
  },
  react: {
    keywords: ['react'],
    cves: [
      { id: 'CVE-2018-6341', severity: 'High', score: 7.1, description: 'XSS via server-side rendering in React < 16.5.2.' },
    ],
  },
  vue: {
    keywords: ['vue'],
    cves: [
      { id: 'CVE-2021-43984', severity: 'Medium', score: 6.1, description: 'XSS via v-html directive in Vue.js with unsanitised user input.' },
    ],
  },
  handlebars: {
    keywords: ['handlebars', 'hbs'],
    cves: [
      { id: 'CVE-2021-23369', severity: 'Critical', score: 9.8, description: 'RCE in Handlebars.js via template prototype pollution < 4.7.7.' },
      { id: 'CVE-2019-19919', severity: 'Critical', score: 9.8, description: 'Prototype pollution in Handlebars.js lookup helper < 4.5.3.' },
    ],
  },
  underscore: {
    keywords: ['underscore'],
    cves: [
      { id: 'CVE-2021-23358', severity: 'High', score: 7.2, description: 'Arbitrary code execution in Underscore.js template function < 1.13.0.' },
    ],
  },
  marked: {
    keywords: ['marked'],
    cves: [
      { id: 'CVE-2022-21680', severity: 'High', score: 7.5, description: 'ReDoS in marked.js via inline heading patterns < 4.0.10.' },
      { id: 'CVE-2022-21681', severity: 'High', score: 7.5, description: 'ReDoS in marked.js via inline text patterns < 4.0.10.' },
    ],
  },
  dompurify: {
    keywords: ['dompurify'],
    cves: [
      { id: 'CVE-2024-45801', severity: 'Critical', score: 9.9, description: 'Prototype pollution in DOMPurify < 3.1.3 via namespace confusion.' },
    ],
  },
};

// ─── Content-based library signature detection ───────────────────────────────
// Patterns that appear in minified/bundled library code, distinct from filenames.
const LIB_CONTENT_SIGNATURES: Record<string, string[]> = {
  jquery:     ['/*! jQuery', 'jQuery.fn.jquery=', 'jQuery.fn.jquery =', 'window.jQuery='],
  lodash:     ['/*! Lodash', '/*! Lo-Dash', '_.VERSION=', '_.VERSION =', 'lodash.VERSION'],
  moment:     ['/*! moment.js', 'moment.version=', 'moment.version ='],
  axios:      ['/*! axios', 'axios.VERSION=', 'axios.VERSION ='],
  bootstrap:  ['/*! Bootstrap', 'Bootstrap.VERSION', '$.fn.tooltip.Constructor'],
  angular:    ['/*! AngularJS', 'angular.version={', 'angular.version = {'],
  react:      ['/*! React', 'React.version=', 'React.version ='],
  vue:        ['/*! Vue.js', 'Vue.version=', 'Vue.version ='],
  handlebars: ['/*! handlebars', 'Handlebars.VERSION=', 'Handlebars.VERSION ='],
  underscore: ['/*! Underscore.js', 'exports._=', 'exports._ ='],
  marked:     ['/*! marked', 'marked.version=', 'marked.version ='],
  dompurify:  ['/*! DOMPurify', 'DOMPurify.version=', 'exports.DOMPurify'],
};

function matchesLibSignature(content: string, libKey: string): boolean {
  const sigs = LIB_CONTENT_SIGNATURES[libKey] || [];
  return sigs.some(s => content.includes(s));
}

function detectRequireImport(content: string, keywords: string[]): boolean {
  return keywords.some(kw => {
    if (content.includes(`require('${kw}')`) || content.includes(`require("${kw}")`)) return true;
    if (content.includes(`from '${kw}'`) || content.includes(`from "${kw}"`)) return true;
    return false;
  });
}

// ─── Tightened secret patterns ───────────────────────────────────────────────
// Specific, high-confidence patterns are checked first (low FP rate).
// The generic pattern requires longer values and validates content to cut noise.
const FALSE_POSITIVE_TERMS = /^(test|your|my|example|demo|dummy|fake|sample|placeholder|replace|changeme|insert|xxxxxxx|0000000)/i;
const ALL_SAME_CHAR = /^(.)\1+$/;

function looksLikeRealSecret(value: string): boolean {
  if (value.length < 20) return false;
  if (ALL_SAME_CHAR.test(value)) return false;
  if (FALSE_POSITIVE_TERMS.test(value)) return false;
  // Require at least some character variety (digit or uppercase or special)
  const hasDigit   = /\d/.test(value);
  const hasUpper   = /[A-Z]/.test(value);
  const hasSpecial = /[+/=@._~]/.test(value);
  return hasDigit || hasUpper || hasSpecial;
}

interface SecretPattern { pattern: RegExp; label: string; validate?: (value: string) => boolean; }

const SECRET_PATTERNS: SecretPattern[] = [
  // High-specificity patterns — very low false-positive rate
  { pattern: /AIza[0-9A-Za-z-_]{35}/g,                                                   label: 'Google API Key' },
  { pattern: /xox[bpgr]-[0-9]{10,13}-[0-9]{10,13}-[0-9A-Za-z]{10,32}/g,                 label: 'Slack Token' },
  { pattern: /sk_live_[0-9a-zA-Z]{24,}/g,                                                label: 'Stripe Secret Key' },
  { pattern: /pk_live_[0-9a-zA-Z]{24,}/g,                                                label: 'Stripe Publishable Key' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g,                                                    label: 'GitHub PAT' },
  { pattern: /github_pat_[a-zA-Z0-9_]{82,}/g,                                            label: 'GitHub Fine-Grained PAT' },
  { pattern: /AKIA[0-9A-Z]{16}/g,                                                        label: 'AWS Access Key ID' },
  // Tightened generic pattern: narrower keyword set, 20+ char values, validated
  {
    pattern: /\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"]([^'"]{20,})['"]/gi,
    label: 'Hardcoded Secret',
    validate: (match: string) => {
      // Extract just the value portion (inside quotes)
      const m = match.match(/['"]([^'"]{20,})['"]\s*$/);
      return m ? looksLikeRealSecret(m[1]) : false;
    },
  },
];

export async function analyzeExtension(
  file: File | Blob | ArrayBuffer | Uint8Array,
  externalReputation?: ReputationData
): Promise<AnalysisResult> {
  let data: ArrayBuffer;
  if (file instanceof File || file instanceof Blob) {
    data = await file.arrayBuffer();
  } else if (file instanceof Uint8Array) {
    data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } else {
    data = file;
  }

  // Handle CRX files (they have a header before the ZIP content)
  const view = new DataView(data);
  if (view.byteLength > 4 && view.getUint32(0, true) === 0x34327243) { // 'Cr24'
    const version = view.getUint32(4, true);
    let offset = 0;
    if (version === 2) {
      const publicKeyLength = view.getUint32(8, true);
      const signatureLength = view.getUint32(12, true);
      offset = 16 + publicKeyLength + signatureLength;
    } else if (version === 3) {
      const headerLength = view.getUint32(8, true);
      offset = 12 + headerLength;
    }

    if (offset > 0 && offset < data.byteLength) {
      data = data.slice(offset);
    }
  }

  const zip = await JSZip.loadAsync(data);
  const manifestFile = zip.file('manifest.json');

  if (!manifestFile) {
    throw new Error('manifest.json not found in extension');
  }

  const manifestContent = await manifestFile.async('string');
  const manifest = JSON.parse(manifestContent);

  // Resolve localized name
  let name = manifest.name || 'Unknown';
  if (name.startsWith('__MSG_')) {
    name = await resolveLocaleString(zip, manifest, name);
  }

  // Extract icon
  let icon: string | undefined;
  if (manifest.icons) {
    const iconPath = manifest.icons['48'] || manifest.icons['128'] || manifest.icons['16'];
    if (iconPath) {
      const iconFile = zip.file(iconPath);
      if (iconFile) {
        const iconData = await iconFile.async('base64');
        const mimeType = iconPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        icon = `data:${mimeType};base64,${iconData}`;
      }
    }
  }

  const permissions = analyzePermissions(manifest.permissions || [], manifest.host_permissions || []);
  const manifestVersion = manifest.manifest_version || 2;
  const { apiCalls, secrets, dependencies, isObfuscated, obfuscationScore, obfuscationTriggers } = await analyzeSourceCode(zip);
  const vulnerabilities = detectVulnerabilities(dependencies);

  const { score: riskScore, equation: riskEquation, level: riskLevel } = calculateDetailedRisk(
    permissions,
    vulnerabilities,
    manifestVersion,
    obfuscationScore
  );

  const safetyScore = 100 - riskScore;

  let reputationScore: number | undefined;
  let reputationBreakdown: ReputationBreakdown | undefined;
  let reputationEquation: string | undefined;

  if (externalReputation) {
    const repResult = calculateReputationScore(externalReputation);
    reputationScore = repResult.score;
    reputationBreakdown = repResult.breakdown;
    reputationEquation = repResult.equation;
  }

  return {
    name,
    version: manifest.version || '0.0.0',
    icon,
    manifestVersion,
    permissions,
    apiCalls,
    secrets,
    dependencies,
    vulnerabilities,
    cvssScore: vulnerabilities.reduce((max, v) => Math.max(max, v.score || 0), 0),
    riskLevel,
    safetyScore,
    riskEquation,
    isObfuscated,
    obfuscationScore,
    obfuscationTriggers,
    reputation: externalReputation,
    reputationScore,
    reputationBreakdown,
    reputationEquation,
  };
}

async function resolveLocaleString(zip: JSZip, manifest: any, key: string): Promise<string> {
  const messageKey = key.replace('__MSG_', '').replace('__', '');
  const defaultLocale = manifest.default_locale || 'en';

  // Try default locale first, then look for any locale if not found
  const locales = [defaultLocale, 'en', 'en_US', 'en_GB'];

  for (const locale of locales) {
    const localePath = `_locales/${locale}/messages.json`;
    const localeFile = zip.file(localePath);
    if (localeFile) {
      try {
        const content = await localeFile.async('string');
        const messages = JSON.parse(content);
        if (messages[messageKey] && messages[messageKey].message) {
          return messages[messageKey].message;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // Last ditch effort: search all locales
  const localeFiles = zip.filter((path) => path.startsWith('_locales/') && path.endsWith('messages.json'));
  for (const file of localeFiles) {
    try {
      const content = await file.async('string');
      const messages = JSON.parse(content);
      if (messages[messageKey] && messages[messageKey].message) {
        return messages[messageKey].message;
      }
    } catch (e) {}
  }

  return key; // Fallback to original key if not found
}

const PERMISSION_MAPPING: Record<string, { risk: 'Low' | 'Medium' | 'High' | 'Critical', description: string }> = {
  'activeTab': { risk: 'Low', description: 'Access the current tab when the user interacts with the extension.' },
  'alarms': { risk: 'Low', description: 'Schedule code to run at specific times.' },
  'bookmarks': { risk: 'Medium', description: 'Read and modify browser bookmarks.' },
  'browsingData': { risk: 'High', description: 'Clear browsing data like cookies and history.' },
  'clipboardRead': { risk: 'High', description: 'Read data from the clipboard.' },
  'clipboardWrite': { risk: 'Medium', description: 'Write data to the clipboard.' },
  'cookies': { risk: 'High', description: 'Access and modify cookies for any website.' },
  'debugger': { risk: 'Critical', description: 'Use the browser debugger protocol, which allows full control over the browser.' },
  'desktopCapture': { risk: 'High', description: 'Capture screenshots of the desktop.' },
  'downloads': { risk: 'Medium', description: 'Manage browser downloads.' },
  'geolocation': { risk: 'Medium', description: 'Access the user\'s physical location.' },
  'history': { risk: 'High', description: 'Read and modify the browser\'s history.' },
  'identity': { risk: 'Medium', description: 'Access the user\'s Google account identity.' },
  'management': { risk: 'High', description: 'Manage other installed extensions and apps.' },
  'notifications': { risk: 'Low', description: 'Display desktop notifications.' },
  'proxy': { risk: 'High', description: 'Manage the browser\'s proxy settings.' },
  'sessions': { risk: 'High', description: 'Enumerate and restore open tabs and windows.' },
  'storage': { risk: 'Low', description: 'Store and retrieve data locally.' },
  'tabGroups': { risk: 'Low', description: 'Manage tab groups.' },
  'tabs': { risk: 'Medium', description: 'Access tab metadata like URL and title.' },
  'topSites': { risk: 'Low', description: 'Access the list of the user\'s most visited websites.' },
  'webNavigation': { risk: 'Medium', description: 'Receive notifications about the status of navigation requests.' },
  'webRequest': { risk: 'High', description: 'Intercept, block, or modify network requests.' },
  'webRequestBlocking': { risk: 'High', description: 'Block or modify network requests (requires webRequest).' },
  '<all_urls>': { risk: 'Critical', description: 'Full access to all websites the user visits.' },
};

export function analyzePermissions(permissions: string[], hostPermissions: string[]): PermissionInfo[] {
  const allPermissions = [...new Set([...permissions, ...hostPermissions])];
  const RISK_ORDER = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };

  return allPermissions.map(p => {
    if (PERMISSION_MAPPING[p]) {
      return {
        permission: p,
        risk: PERMISSION_MAPPING[p].risk,
        description: PERMISSION_MAPPING[p].description,
      };
    }

    // Check for URL patterns in host permissions
    if (p.includes('://') || p === '<all_urls>') {
      return {
        permission: p,
        risk: p === '<all_urls>' ? 'Critical' : 'High',
        description: `Access to data on ${p === '<all_urls>' ? 'all websites' : p}.`,
      };
    }

    return {
      permission: p,
      risk: 'Low',
      description: 'Standard extension permission.',
    };
  }).sort((a, b) => {
    const riskDiff = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
    if (riskDiff !== 0) return riskDiff;
    return a.permission.localeCompare(b.permission);
  });
}

async function analyzeSourceCode(zip: JSZip): Promise<{
  apiCalls: string[];
  secrets: string[];
  dependencies: string[];
  isObfuscated: boolean;
  obfuscationScore: number;
  obfuscationTriggers: ObfuscationTrigger[];
}> {
  const apiCallsSet = new Set<string>();
  const secretsSet = new Set<string>();
  const dependenciesSet = new Set<string>();

  const highEntropyFiles: string[] = [];
  const longLineFilesList: string[] = [];
  const suspiciousIdentifierFilesList: string[] = [];
  const knownObfuscatorFiles: string[] = [];

  let totalEntropy = 0;
  let jsFileCount = 0;

  const API_PATTERNS = [
    /chrome\.\w+/g,
    /browser\.\w+/g,
    /fetch\s*\(/g,
    /XMLHttpRequest/g,
    /eval\s*\(/g,
    /setTimeout\s*\(\s*['"]/g, // Dynamic code execution
    /localStorage/g,
    /sessionStorage/g,
    /indexedDB/g,
    /connect\s*\(/g,
    /sendMessage\s*\(/g,
  ];

  const files = Object.keys(zip.files);
  for (const fileName of files) {
    if (fileName.endsWith('.js') || fileName.endsWith('.html') || fileName.endsWith('.json')) {
      const content = await zip.files[fileName].async('string');

      // ── Dependency detection: filename-based (using CVE_DATABASE keywords) ──
      if (fileName.endsWith('.js')) {
        const baseName = (fileName.split('/').pop() || fileName).toLowerCase();
        for (const [, libInfo] of Object.entries(CVE_DATABASE)) {
          if (libInfo.keywords.some(kw => baseName.includes(kw))) {
            dependenciesSet.add(fileName.split('/').pop() || fileName);
            break; // Only register a file once
          }
        }
      }

      // ── Dependency detection: package.json bundled in the extension ──
      if (fileName === 'package.json' || fileName.endsWith('/package.json')) {
        try {
          const pkg = JSON.parse(content);
          const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
          for (const [depName, depVersion] of Object.entries(allDeps)) {
            const depLower = depName.toLowerCase();
            for (const [, libInfo] of Object.entries(CVE_DATABASE)) {
              if (libInfo.keywords.some(kw => depLower === kw || depLower.endsWith(`/${kw}`))) {
                dependenciesSet.add(`${depName}@${depVersion}`);
                break;
              }
            }
          }
        } catch (e) {
          // Ignore invalid package.json
        }
      }

      if (fileName.endsWith('.js')) {
        jsFileCount++;

        // ── Dependency detection: content-based (bundled libs) ──
        for (const [libKey, libInfo] of Object.entries(CVE_DATABASE)) {
          const alreadyDetected = Array.from(dependenciesSet).some(d =>
            libInfo.keywords.some(kw => d.toLowerCase().includes(kw))
          );
          if (!alreadyDetected) {
            const foundViaSignature = matchesLibSignature(content, libKey);
            const foundViaImport    = detectRequireImport(content, libInfo.keywords);
            if (foundViaSignature || foundViaImport) {
              dependenciesSet.add(`${libKey} (bundled)`);
            }
          }
        }

        // 1. Entropy
        const entropy = calculateEntropy(content);
        totalEntropy += entropy;
        if (entropy > 5.5) {
          highEntropyFiles.push(fileName);
        }

        // 2. Line Length
        const lines = content.split('\n');
        const longLines = lines.filter(l => l.length > 500).length;
        if (lines.length > 0 && (longLines / lines.length) > 0.1) {
          longLineFilesList.push(fileName);
        }

        // 3. Identifier Suspicion
        const identifiers = content.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
        if (identifiers.length > 100) {
          const suspicious = identifiers.filter(id => id.length === 1 || id.match(/^_0x[a-f0-9]+/)).length;
          if ((suspicious / identifiers.length) > 0.3) {
            suspiciousIdentifierFilesList.push(fileName);
          }
        }

        // 4. Known Obfuscator Signatures
        if (content.includes('javascript-obfuscator') || content.match(/_0x[a-f0-9]{4,6}\s*=\s*\[/)) {
          knownObfuscatorFiles.push(fileName);
        }
      }

      // ── API Calls ──
      API_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) matches.forEach(m => apiCallsSet.add(m.trim()));
      });

      // ── Secret Detection (tightened) ──
      for (const { pattern, label, validate } of SECRET_PATTERNS) {
        // Reset lastIndex for stateful patterns
        pattern.lastIndex = 0;
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (!validate || validate(match)) {
              secretsSet.add(`[${label}] Potential hardcoded secret in ${fileName}`);
              break; // One report per pattern per file to avoid noise
            }
          }
        }
      }
    }
  }

  const avgEntropy = jsFileCount > 0 ? totalEntropy / jsFileCount : 0;
  void avgEntropy; // used implicitly via signals
  const manyHighEntropy = highEntropyFiles.length > 0 && (highEntropyFiles.length / Math.max(1, jsFileCount)) > 0.2;
  const manyLongLines = longLineFilesList.length > 0 && (longLineFilesList.length / Math.max(1, jsFileCount)) > 0.2;
  const manySuspiciousIdentifiers = suspiciousIdentifierFilesList.length > 0 && (suspiciousIdentifierFilesList.length / Math.max(1, jsFileCount)) > 0.2;
  const knownObfuscatorFound = knownObfuscatorFiles.length > 0;

  let signals = 0;
  const triggers: ObfuscationTrigger[] = [];

  if (knownObfuscatorFound) {
    triggers.push({
      type: 'Known Obfuscator',
      description: 'Signatures of known obfuscation tools (like javascript-obfuscator) were detected.',
      files: knownObfuscatorFiles
    });
  }

  if (manyHighEntropy) {
    signals++;
    triggers.push({
      type: 'High Entropy',
      description: 'Unusually high information density, typical of compressed or encrypted code.',
      files: highEntropyFiles
    });
  }
  if (manyLongLines) {
    signals++;
    triggers.push({
      type: 'Long Lines',
      description: 'Extremely long lines of code, often used to hide malicious logic from manual review.',
      files: longLineFilesList
    });
  }
  if (manySuspiciousIdentifiers) {
    signals++;
    triggers.push({
      type: 'Suspicious Identifiers',
      description: 'High frequency of short or hex-encoded variable names.',
      files: suspiciousIdentifierFilesList
    });
  }

  const isObfuscated = knownObfuscatorFound || signals >= 2;
  const obfuscationScore = knownObfuscatorFound ? 10 : signals === 1 ? 5 : signals >= 2 ? 10 : 0;

  return {
    apiCalls: Array.from(apiCallsSet),
    secrets: Array.from(secretsSet),
    dependencies: Array.from(dependenciesSet),
    isObfuscated,
    obfuscationScore,
    obfuscationTriggers: triggers,
  };
}

export function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Match dependencies (filenames, normalised names, package.json entries) against
 * the CVE_DATABASE.  The matching intentionally uses substring inclusion so that
 * filenames like "jquery-1.js", normalised names like "jquery (bundled)", and
 * package.json entries like "jquery@^3.5.0" all map to the right CVE set.
 */
export function detectVulnerabilities(dependencies: string[]): Vulnerability[] {
  const vulnerabilitiesMap = new Map<string, Vulnerability>();

  dependencies.forEach(dep => {
    const depLower = dep.toLowerCase();
    for (const [, libInfo] of Object.entries(CVE_DATABASE)) {
      if (libInfo.keywords.some(kw => depLower.includes(kw))) {
        libInfo.cves.forEach(cve => vulnerabilitiesMap.set(cve.id, { ...cve }));
        break; // One library match per dependency entry
      }
    }
  });

  return Array.from(vulnerabilitiesMap.values()).sort((a, b) => {
    if (a.score !== undefined && b.score !== undefined) {
      return b.score - a.score;
    }
    if (a.score !== undefined) return -1;
    if (b.score !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
}

export function calculateDetailedRisk(
  permissions: PermissionInfo[],
  vulnerabilities: Vulnerability[],
  manifestVersion: number,
  obfuscationScore: number
): { score: number; equation: string; level: 'Low' | 'Medium' | 'High' | 'Critical' } {
  // Explicitly deduplicate vulnerabilities by ID to ensure correct scoring
  const uniqueVulnerabilities = Array.from(new Map(vulnerabilities.map(v => [v.id, v])).values());

  // 1. Permission severity (0–40 pts)
  let permissionScore = 0;
  permissions.forEach(p => {
    if (p.risk === 'Critical') permissionScore += 10;
    else if (p.risk === 'High') permissionScore += 5;
    else if (p.risk === 'Medium') permissionScore += 2;
    else if (p.risk === 'Low') permissionScore += 0.5;
  });
  permissionScore = Math.min(40, permissionScore);

  // 2. CVE count (0–20 pts)
  const cveCountScore = Math.min(20, uniqueVulnerabilities.length * 4);

  // 3. CVE severity (CVSS) (0–25 pts)
  let highestCVSS = 0;
  uniqueVulnerabilities.forEach(v => {
    if (v.score && v.score > highestCVSS) highestCVSS = v.score;
  });
  const cvssScore = Math.pow(highestCVSS / 10, 1.5) * 25;

  // 4. Manifest V2 vs V3 (5 pts)
  const manifestScore = manifestVersion === 2 ? 5 : 0;

  const totalScore = Math.min(100, Math.round(permissionScore + cveCountScore + cvssScore + manifestScore + obfuscationScore));

  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (totalScore >= 75) level = 'Critical';
  else if (totalScore >= 50) level = 'High';
  else if (totalScore >= 25) level = 'Medium';

  const equation = `Safety = 100 - [Permissions(${permissionScore.toFixed(0)}) + CVEs(${cveCountScore}) + CVSS(${cvssScore.toFixed(0)}) + MV${manifestVersion}(${manifestScore}) + Obf(${obfuscationScore})]`;

  return { score: totalScore, equation, level };
}

/**
 * Reputation score (0–100).
 *
 * Breakdown:
 *   Rating value      0–20 pts   (star rating / 5  × 20)
 *   Rating count      0–20 pts   (log-scaled, penalised if ratio suspicious)
 *   User count        0–30 pts   (log-scaled up to 10M users)
 *   Last updated      0–30 pts   (recency tiers)
 *   Badges            0–15 pts   (isFeatured +5, isVerifiedPublisher +10)
 *
 * Previously isFeatured / isVerifiedPublisher were scraped but never factored
 * into the score.  They are now included as the "badges" component.
 */
export function calculateReputationScore(reputation: ReputationData): { score: number; breakdown: ReputationBreakdown; equation: string } {
  let rating = 0;
  let ratingCount = 0;
  let usersScore = 0;
  let updated = 0;

  const users = parseInt(reputation.userCount.replace(/[^0-9]/g, '')) || 0;

  // 1. Rating value (20 pts)
  if (reputation.ratingCount > 0) {
    rating = (reputation.rating / 5) * 20;
  }

  // 2. Rating count (20 pts)
  // Log-scaled: log10(count)/log10(100k) * 20, capped at 20
  if (reputation.ratingCount > 0) {
    let ratingCountPoints = (Math.log10(reputation.ratingCount) / 5) * 20; // log10(100k) = 5
    ratingCountPoints = Math.min(20, Math.max(0, ratingCountPoints));

    // Ratio-based penalty: If suspiciously low or high compared to users
    if (users > 100) {
      const ratio = reputation.ratingCount / users;
      // Typical healthy ratio is between 0.01% and 10%.
      // We penalise if < 0.01% or > 10%
      if (ratio < 0.0001 || ratio > 0.1) {
        ratingCountPoints *= 0.5; // 50% penalty
      }
    }
    ratingCount = ratingCountPoints;
  }

  // 3. User count (30 pts) - Log-scaled: log10(users)/log10(10M) * 30, capped at 30
  if (users > 0) {
    const userPoints = (Math.log10(users) / 7) * 30; // log10(10M) = 7
    usersScore = Math.min(30, Math.max(0, userPoints));
  }

  // 4. Last updated recency (30 pts)
  const lastUpdated = new Date(reputation.lastUpdated);
  if (!isNaN(lastUpdated.getTime())) {
    const monthsSinceUpdate = (new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceUpdate < 3) updated = 30;
    else if (monthsSinceUpdate < 6) updated = 20;
    else if (monthsSinceUpdate < 12) updated = 10;
    else if (monthsSinceUpdate < 18) updated = 5;
    else updated = 0;
  } else if (reputation.lastUpdated) {
    // Fallback if date is present but not parsable by new Date()
    updated = 5;
  }

  // 5. Badges (0–15 pts) — previously scraped but never used in the score
  let badges = 0;
  if (reputation.isVerifiedPublisher) badges += 10; // Established / verified publisher
  if (reputation.isFeatured)          badges +=  5; // Featured / follows recommended practices

  const score = Math.min(100, Math.round(rating + ratingCount + usersScore + updated + badges));
  const equation = `Reputation = Rating(${rating.toFixed(0)}) + RatingCount(${ratingCount.toFixed(0)}) + Users(${usersScore.toFixed(0)}) + Updated(${updated.toFixed(0)}) + Badges(${badges})`;

  return {
    score,
    breakdown: { publisher: 0, rating, ratingCount, users: usersScore, updated, badges },
    equation
  };
}
