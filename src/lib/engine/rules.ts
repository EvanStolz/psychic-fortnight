// The scoring rules in one place. The engine scores with these tables and the Method page renders them.

import type { Tier } from './types';

/** Points per API permission. Anything not listed is unknown and sends the verdict to Review. */
export const PERMISSION_POINTS: Record<string, { points: number; label: string }> = {
  proxy: { points: 30, label: 'Proxy' },
  debugger: { points: 30, label: 'Debugger' },
  vpnProvider: { points: 30, label: 'VPN provider' },
  nativeMessaging: { points: 20, label: 'Native app messaging' },
  webAuthenticationProxy: { points: 20, label: 'Sign-in proxy' },
  cookies: { points: 15, label: 'Cookies' },
  management: { points: 15, label: 'Manages extensions' },
  privacy: { points: 15, label: 'Privacy settings' },
  desktopCapture: { points: 15, label: 'Screen capture' },
  userScripts: { points: 15, label: 'User scripts' },
  webRequestFilterResponse: { points: 15, label: 'Rewrites responses' },
  scripting: { points: 10, label: 'Scripting' },
  webRequest: { points: 10, label: 'Web requests' },
  history: { points: 10, label: 'History' },
  browsingData: { points: 10, label: 'Browsing data' },
  clipboardRead: { points: 10, label: 'Clipboard read' },
  pageCapture: { points: 10, label: 'Page capture' },
  tabCapture: { points: 10, label: 'Tab capture' },
  contentSettings: { points: 10, label: 'Content settings' },
  certificateProvider: { points: 10, label: 'Certificates' },
  platformKeys: { points: 10, label: 'Platform keys' },
  pkcs11: { points: 10, label: 'Security modules' },
  tabs: { points: 5, label: 'Tabs' },
  identity: { points: 5, label: 'Identity' },
  'identity.email': { points: 5, label: 'Account email' },
  webNavigation: { points: 5, label: 'Navigation' },
  downloads: { points: 5, label: 'Downloads' },
  'downloads.open': { points: 5, label: 'Opens downloads' },
  geolocation: { points: 5, label: 'Location' },
  sessions: { points: 5, label: 'Sessions' },
  declarativeNetRequest: { points: 5, label: 'Network rules' },
  declarativeNetRequestWithHostAccess: { points: 5, label: 'Network rules' },
  declarativeNetRequestFeedback: { points: 5, label: 'Network rule matches' },
  webRequestAuthProvider: { points: 5, label: 'Answers sign-in prompts' },
  processes: { points: 5, label: 'Processes' },
  dns: { points: 5, label: 'DNS lookups' },
  find: { points: 5, label: 'Finds page text' },
  browserSettings: { points: 5, label: 'Browser settings' },
  'accessibilityFeatures.modify': { points: 5, label: 'Accessibility settings' },
  bookmarks: { points: 3, label: 'Bookmarks' },
  topSites: { points: 3, label: 'Top sites' },
  readingList: { points: 3, label: 'Reading list' },
  search: { points: 3, label: 'Search' },
  tabGroups: { points: 3, label: 'Tab groups' },
  contextualIdentities: { points: 3, label: 'Containers' },
  'accessibilityFeatures.read': { points: 3, label: 'Accessibility settings' },
  // No meaningful reach on their own.
  activeTab: { points: 0, label: 'Active tab' },
  alarms: { points: 0, label: 'Alarms' },
  audio: { points: 0, label: 'Audio' },
  background: { points: 0, label: 'Background' },
  captivePortal: { points: 0, label: 'Captive portal' },
  clipboardWrite: { points: 0, label: 'Clipboard write' },
  contextMenus: { points: 0, label: 'Menus' },
  declarativeContent: { points: 0, label: 'Page rules' },
  documentScan: { points: 0, label: 'Scanning' },
  'enterprise.deviceAttributes': { points: 0, label: 'Device attributes' },
  'enterprise.hardwarePlatform': { points: 0, label: 'Hardware platform' },
  'enterprise.networkingAttributes': { points: 0, label: 'Network attributes' },
  'enterprise.platformKeys': { points: 0, label: 'Platform keys' },
  favicon: { points: 0, label: 'Favicons' },
  fileBrowserHandler: { points: 0, label: 'File handler' },
  fileSystemProvider: { points: 0, label: 'File system' },
  fontSettings: { points: 0, label: 'Fonts' },
  gcm: { points: 0, label: 'Push messages' },
  idle: { points: 0, label: 'Idle state' },
  loginState: { points: 0, label: 'Login state' },
  menus: { points: 0, label: 'Menus' },
  'menus.overrideContext': { points: 0, label: 'Menus' },
  notifications: { points: 0, label: 'Notifications' },
  offscreen: { points: 0, label: 'Offscreen page' },
  power: { points: 0, label: 'Power' },
  printerProvider: { points: 0, label: 'Printers' },
  printing: { points: 0, label: 'Printing' },
  printingMetrics: { points: 0, label: 'Printing' },
  runtime: { points: 0, label: 'Runtime' },
  sidePanel: { points: 0, label: 'Side panel' },
  storage: { points: 0, label: 'Storage' },
  'system.cpu': { points: 0, label: 'System info' },
  'system.display': { points: 0, label: 'System info' },
  'system.memory': { points: 0, label: 'System info' },
  'system.storage': { points: 0, label: 'System info' },
  theme: { points: 0, label: 'Theme' },
  tts: { points: 0, label: 'Speech' },
  ttsEngine: { points: 0, label: 'Speech engine' },
  unlimitedStorage: { points: 0, label: 'Unlimited storage' },
  wallpaper: { points: 0, label: 'Wallpaper' },
  webRequestBlocking: { points: 0, label: 'Blocking requests' },
};

export const CAPABILITY_RULES = {
  allSites: { points: 30, label: 'All sites' },
  manySites: { points: 15, label: 'Many sites' },
  someSites: { points: 5, label: 'Some sites' },
  cookiesAllSites: { points: 10, label: 'Cookies + all sites' },
  externalAny: { points: 10, label: 'Any site can message it' },
  earlyPageScript: { points: 5, label: 'Early page script' },
  mv2: { points: 5, label: 'Manifest V2' },
};

/** Host patterns on this many distinct sites count as "many sites". */
export const MANY_SITES = 5;

export const CODE_RULES = {
  obfuscated: { points: 20, label: 'Obfuscated code' },
  builtCode: { points: 15, label: 'Code built from data' },
  disablesExtensions: { points: 15, label: 'Turns off extensions' },
  remoteScriptsCsp: { points: 15, label: 'Allows remote scripts' },
  setsProxy: { points: 10, label: 'Sets the proxy' },
  readsAllCookies: { points: 10, label: 'Reads all cookies' },
  rewritesHeaders: { points: 10, label: 'Rewrites headers' },
  binaryCode: { points: 5, label: 'Binary code' },
  secret: { points: 5, label: 'Live secret in code' },
};

/** Points for a vulnerable library by its worst known flaw. Low-severity flaws do not score. */
export const LIBRARY_POINTS: Record<string, number> = { medium: 5, high: 10, critical: 15 };

export const REPUTATION_RULES = {
  removed: { points: 60, label: 'Removed from the store' },
  suspicious: { points: 40, label: 'Listed suspicious' },
  gone: { points: 30, label: 'Gone from the store' },
  noPrivacyPolicy: { points: 10, label: 'No privacy policy' },
  notTrader: { points: 5, label: 'Not a trader' },
  freeEmail: { points: 5, label: 'Free email' },
  noWebsite: { points: 5, label: 'No website' },
};

export const HARD_FAILS = {
  malware: 'On a known-malware list',
  offStoreUpdates: 'Updates from outside the store',
  remoteCode: 'Runs code it downloads',
  stripsHeaders: 'Strips page security headers',
  obfuscatedNetwork: 'Obfuscated code with network calls',
  signature: 'Signature fails',
};

/** Upper bounds of Low, Medium and High. Anything above the last is Critical. */
export const TIERS: { capability: [number, number, number]; other: [number, number, number] } = {
  capability: [15, 35, 60],
  other: [9, 24, 49],
};

export function tierFor(points: number, capability: boolean): Tier {
  const [low, medium, high] = capability ? TIERS.capability : TIERS.other;
  if (points <= low) return 'low';
  if (points <= medium) return 'medium';
  if (points <= high) return 'high';
  return 'critical';
}

export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com',
  'aol.com', 'icloud.com', 'me.com', 'mail.com', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'proton.me',
  'protonmail.com', 'yandex.com', 'yandex.ru', 'mail.ru', 'qq.com', '163.com', '126.com', 'zoho.com', 'tutanota.com',
]);

export const STORE_UPDATE_HOSTS = new Set(['clients2.google.com', 'edge.microsoft.com']);
