// GET /api/check?q=<link or ID>: looks up the current version, then redirects to its cached report.

import type { NextRequest } from 'next/server';
import { InputError, parseTarget } from '@/lib/engine/input';
import { analysisPath, CACHE_SHORT, failure, fromError, redirect } from '@/lib/server/http';
import { currentRelease } from '@/lib/server/stores';

export async function GET(request: NextRequest): Promise<Response> {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  let target;
  try {
    target = parseTarget(q.slice(0, 500));
  } catch (e) {
    if (e instanceof InputError) return failure(e.message, 400, CACHE_SHORT);
    throw e;
  }
  try {
    const lookup = await currentRelease(target.store, target.id);
    if (lookup.status === 'gone') return failure('This extension is not in the store. If you have the file, upload it instead.', 404, CACHE_SHORT);
    return redirect(analysisPath(target.store, lookup.release.id, lookup.release.version));
  } catch (e) {
    return fromError(e);
  }
}
