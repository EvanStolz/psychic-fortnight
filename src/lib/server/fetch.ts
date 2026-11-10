// Outbound requests with a size cap and a timeout, so one slow or huge response cannot exhaust a function.

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
  }
}

export interface Fetched {
  status: number;
  url: string;
  headers: Headers;
  bytes: Uint8Array;
}

const TIMEOUT_MS = 25_000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

export async function fetchLimited(url: string, maxBytes: number, init: RequestInit = {}): Promise<Fetched> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new FetchError(e instanceof Error && e.name === 'TimeoutError' ? 'The store took too long to answer.' : 'The store could not be reached.');
  }
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) {
    await res.body?.cancel();
    throw new FetchError(`The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`, res.status);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new FetchError(`The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`, res.status);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return { status: res.status, url: res.url, headers: res.headers, bytes };
}

export function asText(f: Fetched): string {
  return new TextDecoder().decode(f.bytes);
}

export function asJson(f: Fetched): unknown {
  try {
    return JSON.parse(asText(f)) as unknown;
  } catch {
    throw new FetchError('The store sent a response that is not JSON.', f.status);
  }
}
