// What #4471 holds once each report is placed by what actually went wrong, not by subject.
// A report's problem is its cause (causes.ts): placed by tenant and channel, never by intake's tag.
// Reports the desk read as a one-day move (desk-notes.json) stay with their cause, as on #4471.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'unplaced';

export function problemOf(r: Report, t: Tenant | undefined): Problem {
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: number;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export type Split = { rows: number; unique: number; groups: ProblemGroup[] };

// Every report merged into `ticket`, counted once, grouped by problem, biggest first.
export function splitTicket(rows: Report[], ticket: number, tenantOf: (r: Report) => Tenant | undefined): Split {
  const merged = uniqueById(rows).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = problemOf(r, tenantOf(r));
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const groups = [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs.length,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports - a.reports);
  return { rows: rows.filter((r) => r.mergedInto === ticket).length, unique: merged.length, groups };
}
