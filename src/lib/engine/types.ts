// Shared result schema. The server returns it as JSON and the UI renders it, so it holds plain data only.

export const RULES_VERSION = 1;

export type Store = 'chrome' | 'edge' | 'firefox';
export type Tier = 'low' | 'medium' | 'high' | 'critical';
export type AxisName = 'capability' | 'code' | 'reputation' | 'change';
export type VerdictName = 'approve' | 'review' | 'deny';

/** One line of an axis's math: the points it adds and where it came from. */
export interface Finding {
  rule: string;
  points: number;
  label: string;
  /** Files and lines, or other evidence. Capped so a report stays small. */
  where: string[];
}

export interface Axis {
  name: AxisName;
  /** `scored`: every check on this axis ran. `partial`: some ran. `not-analysed`: none ran. */
  status: 'scored' | 'partial' | 'not-analysed' | 'first-review';
  points: number;
  tier: Tier | null;
  findings: Finding[];
  /** Why a check could not run, shown to the reviewer. */
  gaps: string[];
}

export interface HardFail {
  rule: string;
  label: string;
  detail: string;
  source?: string;
}

export interface Publisher {
  name: string | null;
  website: string | null;
  email: string | null;
  /** EU trader declaration. Null when the store does not say. */
  trader: boolean | null;
}

/** Store listing facts. Context only: none of these score except the publisher's contact details. */
export interface Listing {
  url: string;
  name: string | null;
  users: number | null;
  rating: number | null;
  ratingCount: number | null;
  updated: string | null;
  featured: boolean | null;
  privacyPolicy: string | null;
  /** False only when the store clearly shows there is none. */
  hasPrivacyPolicy: boolean | null;
  publisher: Publisher;
}

export type ListingResult =
  | { status: 'ok'; listing: Listing }
  | { status: 'gone' }
  | { status: 'error'; reason: string }
  | { status: 'none' };

export interface Signature {
  status: 'verified' | 'failed' | 'unsigned' | 'store-delivered';
  detail: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  manifestVersion: number;
  bytes: number;
  files: number;
  /** Scripts the code checks read. */
  scripts: number;
  /** A small data URL of the extension's own icon, or null. */
  icon: string | null;
}

export interface Report {
  rulesVersion: number;
  store: Store | null;
  id: string | null;
  package: PackageInfo | null;
  signature: Signature | null;
  verdict: VerdictName;
  /** Short reasons for the verdict, most important first. */
  reasons: string[];
  hardFails: HardFail[];
  axes: Record<AxisName, Axis>;
  listing: Listing | null;
  analysedAt: string;
}
