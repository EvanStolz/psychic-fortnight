// Reads every script as a syntax tree and scores what the code does. Strings and comments never match a rule.

import type { AnyNode, Expression, Node, ObjectExpression, Options, SpreadElement, Super } from 'acorn';
import { parse } from 'acorn';
import type { SimpleVisitors } from 'acorn-walk';
import { simple } from 'acorn-walk';
import { Tally } from './findings';
import { isObject, parseLooseJson } from './manifest';
import { CODE_RULES, HARD_FAILS } from './rules';
import type { HardFail } from './types';
import { text } from './unzip';

/** Scripts larger than this are not parsed and count as not analysed. */
export const MAX_SCRIPT_BYTES = 12 * 1024 * 1024;
/** This many `_0x1a2b`-style names in one file marks it as machine-obfuscated. */
export const OBFUSCATED_NAMES = 20;

export interface CodeResult {
  code: Tally;
  hardFails: HardFail[];
  scripts: number;
  /** Scripts that could not be parsed or were too large. */
  unreadable: string[];
}

const SCRIPT = /\.(m|c)?js$/i;
const NETWORK = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource']);
const SECURITY_HEADERS = /^(content-security-policy|x-frame-options)$/i;
const REMOTE_URL = /^(https?:)?\/\//i;

const SECRETS: { name: string; re: RegExp }[] = [
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'private key', re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Stripe live key', re: /\bsk_live_[A-Za-z0-9]{20,}/ },
  { name: 'OpenAI key', re: /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/ },
  { name: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{32,}/ },
];

/** Adds to `code` when given, so manifest and code findings share one Code axis. */
export function analyseCode(files: Map<string, Uint8Array>, ruleFiles: string[], code = new Tally()): CodeResult {
  const hardFails: HardFail[] = [];
  const unreadable: string[] = [];
  let scripts = 0;

  for (const [path, bytes] of files) {
    if (/\.wasm$/i.test(path)) code.add('binary', CODE_RULES.binaryCode.points, CODE_RULES.binaryCode.label, path);
    if (!SCRIPT.test(path)) continue;
    scripts++;
    if (bytes.length > MAX_SCRIPT_BYTES) {
      unreadable.push(`${path} (too large)`);
      continue;
    }
    const source = text(bytes);
    const ast = parseScript(source);
    if (!ast) {
      unreadable.push(path);
      continue;
    }
    scanScript(path, source, ast, code, hardFails);
  }

  for (const path of ruleFiles) {
    const raw = files.get(path);
    if (raw) scanRuleFile(path, text(raw), hardFails);
  }

  return { code, hardFails: dedupe(hardFails), scripts, unreadable };
}

function parseScript(source: string): Node | null {
  const base: Options = { ecmaVersion: 'latest', allowHashBang: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true };
  for (const sourceType of ['module', 'script'] as const) {
    try {
      return parse(source, { ...base, sourceType });
    } catch {
      // Try the other source type.
    }
  }
  return null;
}

function scanScript(path: string, source: string, ast: Node, code: Tally, hardFails: HardFail[]): void {
  const at = (node: Node): string => `${path}:${lineOf(source, node.start)}`;
  let obfuscatedNames = 0;
  let network = false;
  const createsScript = /createElement\(\s*["'`]script["'`]\s*\)/.test(source);

  const countName = (name: string): void => {
    if (/^_0x[0-9a-f]{3,}$/i.test(name)) obfuscatedNames++;
    if (NETWORK.has(name)) network = true;
  };

  const builtCode = (node: Node, args: (Expression | SpreadElement)[]): void => {
    const last = args[args.length - 1];
    if (last && !isStaticString(last)) code.add('built-code', CODE_RULES.builtCode.points, CODE_RULES.builtCode.label, at(node));
  };

  const call = (node: Node, callee: Expression | Super, args: (Expression | SpreadElement)[]): void => {
    const name = chain(callee);
    if (name === 'eval' || name === 'window.eval' || name === 'globalThis.eval' || name === 'self.eval') builtCode(node, args.slice(0, 1));
    else if (name === 'Function' || name === 'window.Function' || name === 'globalThis.Function') builtCode(node, args);
    else if (name.endsWith('management.setEnabled')) code.add('disables-extensions', CODE_RULES.disablesExtensions.points, CODE_RULES.disablesExtensions.label, at(node));
    else if (name.endsWith('proxy.settings.set')) code.add('sets-proxy', CODE_RULES.setsProxy.points, CODE_RULES.setsProxy.label, at(node));
    else if (name.endsWith('cookies.getAll') && readsEveryCookie(args[0])) code.add('reads-all-cookies', CODE_RULES.readsAllCookies.points, CODE_RULES.readsAllCookies.label, at(node));
    else if (/on(HeadersReceived|BeforeSendHeaders)\.addListener$/.test(name) && args.some((a) => a.type === 'ArrayExpression' && a.elements.some((e) => e?.type === 'Literal' && e.value === 'blocking'))) {
      code.add('rewrites-headers', CODE_RULES.rewritesHeaders.points, CODE_RULES.rewritesHeaders.label, at(node));
    } else if (/tabs\.executeScript$/.test(name)) {
      const details = args.find((a): a is ObjectExpression => a.type === 'ObjectExpression');
      const codeProp = details && property(details, 'code');
      if (codeProp && !isStaticString(codeProp)) code.add('built-code', CODE_RULES.builtCode.points, CODE_RULES.builtCode.label, at(node));
    } else if (name === 'importScripts' && args.some((a) => isRemoteUrl(a))) {
      hardFails.push({ rule: 'remote-code', label: HARD_FAILS.remoteCode, detail: `importScripts of a remote URL at ${at(node)}.` });
    }
  };

  // acorn-walk reports declared names as VariablePattern, which its types leave out.
  const visitors: SimpleVisitors<unknown> & { VariablePattern: (node: Node) => void } = {
    CallExpression(node) {
      call(node, node.callee, node.arguments);
      if (node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier') countName(node.callee.property.name);
    },
    NewExpression(node) {
      call(node, node.callee, node.arguments);
    },
    ImportExpression(node) {
      if (isRemoteUrl(node.source)) hardFails.push({ rule: 'remote-code', label: HARD_FAILS.remoteCode, detail: `import() of a remote URL at ${at(node)}.` });
    },
    AssignmentExpression(node) {
      if (createsScript && node.left.type === 'MemberExpression' && chain(node.left).endsWith('.src') && isRemoteUrl(node.right) && /\.m?js([?#]|$)/i.test(staticString(node.right) ?? '')) {
        hardFails.push({ rule: 'remote-code', label: HARD_FAILS.remoteCode, detail: `Loads a remote script at ${at(node)}.` });
      }
    },
    ObjectExpression(node) {
      const header = property(node, 'header');
      const operation = property(node, 'operation');
      if (header && operation && SECURITY_HEADERS.test(staticString(header) ?? '') && staticString(operation) === 'remove') {
        hardFails.push({ rule: 'strips-headers', label: HARD_FAILS.stripsHeaders, detail: `Removes ${staticString(header)} at ${at(node)}.` });
      }
    },
    Identifier(node) {
      countName(node.name);
    },
    VariablePattern(node) {
      if (node.type === 'Identifier' && 'name' in node && typeof node.name === 'string') countName(node.name);
    },
    Literal(node) {
      if (typeof node.value !== 'string') return;
      if (NETWORK.has(node.value)) network = true;
      if (node.value.length < 20) return;
      for (const s of SECRETS) {
        if (s.re.test(node.value)) code.add('secret', CODE_RULES.secret.points, CODE_RULES.secret.label, `${s.name} at ${at(node)}`);
      }
    },
  };
  simple(ast, visitors);

  if (obfuscatedNames >= OBFUSCATED_NAMES) {
    code.add('obfuscated', CODE_RULES.obfuscated.points, CODE_RULES.obfuscated.label, path);
    if (network) hardFails.push({ rule: 'obfuscated-network', label: HARD_FAILS.obfuscatedNetwork, detail: `${path} hides its code and talks to the network.` });
  }
}

/** declarativeNetRequest rule files that remove page security headers. */
function scanRuleFile(path: string, source: string, hardFails: HardFail[]): void {
  let rules;
  try {
    rules = parseLooseJson(source);
  } catch {
    return;
  }
  if (!Array.isArray(rules)) return;
  for (const rule of rules) {
    if (!isObject(rule) || !isObject(rule.action) || rule.action.type !== 'modifyHeaders') continue;
    const headers = rule.action.responseHeaders;
    if (!Array.isArray(headers)) continue;
    for (const h of headers) {
      if (isObject(h) && typeof h.header === 'string' && SECURITY_HEADERS.test(h.header) && h.operation === 'remove') {
        hardFails.push({ rule: 'strips-headers', label: HARD_FAILS.stripsHeaders, detail: `Removes ${h.header} in ${path}.` });
      }
    }
  }
}

/** `chrome.cookies.getAll({})` or with only a store ID reads every cookie in the browser. */
function readsEveryCookie(arg: Expression | SpreadElement | undefined): boolean {
  if (!arg) return true;
  if (arg.type !== 'ObjectExpression') return false;
  return !['url', 'domain', 'name'].some((k) => property(arg, k));
}

/** A dotted name for a callee, such as `chrome.proxy.settings.set`. Unknown parts become `?`. */
export function chain(node: Expression | Super): string {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const object = node.object.type === 'Super' ? 'super' : chain(node.object);
    if (!node.computed && node.property.type === 'Identifier') return `${object}.${node.property.name}`;
    if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string') return `${object}.${node.property.value}`;
    return `${object}.?`;
  }
  if (node.type === 'ChainExpression') return chain(node.expression);
  return '?';
}

function property(obj: ObjectExpression, key: string): Expression | null {
  for (const p of obj.properties) {
    if (p.type !== 'Property') continue;
    const name = p.key.type === 'Identifier' && !p.computed ? p.key.name : p.key.type === 'Literal' ? String(p.key.value) : null;
    if (name === key) return p.value;
  }
  return null;
}

function staticString(node: AnyNode): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis.map((q) => q.value.cooked ?? '').join('');
  return null;
}

function isStaticString(node: AnyNode): boolean {
  return staticString(node) !== null;
}

function isRemoteUrl(node: AnyNode): boolean {
  const s = staticString(node);
  return s !== null && REMOTE_URL.test(s);
}

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = source.indexOf('\n'); i >= 0 && i < offset; i = source.indexOf('\n', i + 1)) line++;
  return line;
}

function dedupe(fails: HardFail[]): HardFail[] {
  const seen = new Map<string, HardFail>();
  for (const f of fails) if (!seen.has(f.rule)) seen.set(f.rule, f);
  return [...seen.values()];
}
