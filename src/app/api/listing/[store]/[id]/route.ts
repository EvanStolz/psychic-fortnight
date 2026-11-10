// GET /api/listing/{store}/{id}: listing facts for an uploaded package, which the browser cannot fetch itself.

import type { NextRequest } from 'next/server';
import { isValidTarget } from '@/lib/engine/input';
import { CACHE_REPORT, CACHE_SHORT, failure, json, param } from '@/lib/server/http';
import { fetchListing } from '@/lib/server/stores';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/listing/[store]/[id]'>): Promise<Response> {
  const raw = await ctx.params;
  const id = param(raw.id);
  if (!isValidTarget(raw.store, id)) return failure('Not a valid store or extension ID.', 400, CACHE_SHORT);
  const listing = await fetchListing(raw.store, id);
  return json(listing, 200, listing.status === 'error' ? CACHE_SHORT : CACHE_REPORT);
}
