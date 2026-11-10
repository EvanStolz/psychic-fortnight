// Collects findings for one axis. A rule scores once however often it fires; extra hits only add evidence.

import type { Finding } from './types';

export const MAX_WHERE = 5;

export class Tally {
  private readonly byRule = new Map<string, Finding & { hits: number }>();

  add(rule: string, points: number, label: string, where?: string): void {
    const existing = this.byRule.get(rule);
    if (existing) {
      existing.hits++;
      if (where && existing.where.length < MAX_WHERE && !existing.where.includes(where)) existing.where.push(where);
      return;
    }
    this.byRule.set(rule, { rule, points, label, where: where ? [where] : [], hits: 1 });
  }

  has(rule: string): boolean {
    return this.byRule.has(rule);
  }

  findings(): Finding[] {
    return [...this.byRule.values()]
      .map(({ hits, ...f }) => {
        const more = hits - f.where.length;
        return more > 0 && f.where.length > 0 ? { ...f, where: [...f.where, `and ${more} more`] } : f;
      })
      .sort((a, b) => b.points - a.points);
  }

  total(): number {
    let sum = 0;
    for (const f of this.byRule.values()) sum += f.points;
    return sum;
  }
}
