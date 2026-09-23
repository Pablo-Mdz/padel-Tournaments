import { duelHasStarted, duelTotals, groupMembers } from "./tournament";
import { Duel, GroupId, MATCH_TYPES, MatchType, RankingContext, RoundNo, TournamentState } from "./types";

export interface StandingRow {
  teamId: number;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pf: number;
  pa: number;
  diff: number;
  /** Tie that survives every criterion and must be resolved by hand. */
  unresolvedTie: boolean;
  /** Tie the organiser resolved by hand. */
  manualTie: boolean;
  /** Team ids still level with this team after all automatic criteria (incl. itself). */
  tiedWith: number[];
}

interface Stats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pf: number;
  pa: number;
}

const emptyStats = (): Stats => ({ played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0 });

function relevantDuels(state: TournamentState, rounds: readonly RoundNo[]): Duel[] {
  return state.duels.filter((d) => rounds.includes(d.round) && d.teamA != null && d.teamB != null);
}

/**
 * Points count immediately (also in running duels) so the table is live.
 * Wins/draws/losses only count once the duel is closed.
 */
export function computeStats(state: TournamentState, rounds: readonly RoundNo[]): Map<number, Stats> {
  const map = new Map<number, Stats>();
  for (const t of state.teams) map.set(t.id, emptyStats());
  for (const d of relevantDuels(state, rounds)) {
    const { a, b } = duelTotals(d);
    const sa = map.get(d.teamA!);
    const sb = map.get(d.teamB!);
    if (!sa || !sb) continue;
    sa.pf += a;
    sa.pa += b;
    sb.pf += b;
    sb.pa += a;
    if (d.closed) {
      sa.played++;
      sb.played++;
      if (a > b) {
        sa.won++;
        sb.lost++;
      } else if (b > a) {
        sb.won++;
        sa.lost++;
      } else {
        sa.drawn++;
        sb.drawn++;
      }
    }
  }
  return map;
}

/** Points of the teams in a block, counting only their duels against each other. */
function headToHead(block: number[], duels: Duel[]): Map<number, { pf: number; pa: number }> | null {
  const inBlock = new Set(block);
  const mutual = duels.filter((d) => inBlock.has(d.teamA!) && inBlock.has(d.teamB!) && duelHasStarted(d));
  // Head-to-head only applies when every pair in the block has met; otherwise a
  // team that never faced the others would be penalised for it.
  for (let i = 0; i < block.length; i++) {
    for (let j = i + 1; j < block.length; j++) {
      const met = mutual.some(
        (d) => (d.teamA === block[i] && d.teamB === block[j]) || (d.teamA === block[j] && d.teamB === block[i]),
      );
      if (!met) return null;
    }
  }
  const h = new Map(block.map((id) => [id, { pf: 0, pa: 0 }]));
  for (const d of mutual) {
    const { a, b } = duelTotals(d);
    h.get(d.teamA!)!.pf += a;
    h.get(d.teamA!)!.pa += b;
    h.get(d.teamB!)!.pf += b;
    h.get(d.teamB!)!.pa += a;
  }
  return h;
}

/** Splits a sorted list into runs of equal key. */
function splitBy<T>(items: T[], key: (x: T) => string): T[][] {
  const out: T[][] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && key(last[0]) === key(it)) last.push(it);
    else out.push([it]);
  }
  return out;
}

/** Resolves a block by head-to-head; returns ordered sub-blocks. */
function resolveHeadToHead(block: number[], duels: Duel[]): number[][] {
  if (block.length < 2) return [block];
  const h = headToHead(block, duels);
  if (!h) return [block];
  const sorted = [...block].sort((x, y) => {
    const hx = h.get(x)!;
    const hy = h.get(y)!;
    return hy.pf - hx.pf || hy.pf - hy.pa - (hx.pf - hx.pa);
  });
  const parts = splitBy(sorted, (id) => {
    const s = h.get(id)!;
    return `${s.pf}|${s.pf - s.pa}`;
  });
  if (parts.length === 1) return [block];
  // Remaining smaller blocks are compared again among themselves only.
  return parts.flatMap((p) => (p.length > 1 ? resolveHeadToHead(p, duels) : [p]));
}

/**
 * Ranking by: 1. points for, 2. point difference, 3. head-to-head,
 * 4. organiser's manual order (otherwise flagged as unresolved).
 */
export function rankTeams(
  state: TournamentState,
  teamIds: number[],
  rounds: readonly RoundNo[],
  context: RankingContext,
): StandingRow[] {
  const stats = computeStats(state, rounds);
  const duels = relevantDuels(state, rounds);
  const st = (id: number) => stats.get(id) ?? emptyStats();

  const sorted = [...teamIds].sort((x, y) => {
    const sx = st(x);
    const sy = st(y);
    return sy.pf - sx.pf || sy.pf - sy.pa - (sx.pf - sx.pa) || x - y;
  });
  const blocks = splitBy(sorted, (id) => `${st(id).pf}|${st(id).pf - st(id).pa}`);
  const manual = state.manualOrder[context] ?? [];

  const rows: StandingRow[] = [];
  for (const block of blocks) {
    for (const part of resolveHeadToHead(block, duels)) {
      let ordered = part;
      let unresolved = false;
      let manualTie = false;
      if (part.length > 1) {
        if (part.every((id) => manual.includes(id))) {
          ordered = [...part].sort((x, y) => manual.indexOf(x) - manual.indexOf(y));
          manualTie = true;
        } else {
          ordered = [...part].sort((x, y) => x - y);
          // Before a team has finished a duel a tie carries no meaning – don't raise the alarm yet.
          unresolved = part.every((id) => st(id).played > 0);
        }
      }
      for (const id of ordered) {
        const s = st(id);
        rows.push({
          teamId: id,
          rank: rows.length + 1,
          ...s,
          diff: s.pf - s.pa,
          unresolvedTie: unresolved,
          manualTie,
          tiedWith: part,
        });
      }
    }
  }
  return rows;
}

/** Group table – rounds 1 and 2 only (used to build the round 3 pairings). */
export function groupStandings(state: TournamentState, group: GroupId): StandingRow[] {
  return rankTeams(state, groupMembers(state.teams, group), [1, 2], group === "A" ? "groupA" : "groupB");
}

/** Overall ranking over all three rounds – decides the champion. */
export function overallStandings(state: TournamentState): StandingRow[] {
  return rankTeams(
    state,
    state.teams.map((t) => t.id),
    [1, 2, 3],
    "overall",
  );
}

/**
 * Round 3 cross pairings: 1A–1B, 2A–2B, 3A–3B, 4A–4B on the courts in that order.
 */
export function round3Pairings(state: TournamentState): {
  pairs: Array<[number | null, number | null]>;
  unresolved: boolean;
} {
  const a = groupStandings(state, "A");
  const b = groupStandings(state, "B");
  const pairs: Array<[number | null, number | null]> = [0, 1, 2, 3].map((i) => [
    a[i]?.teamId ?? null,
    b[i]?.teamId ?? null,
  ]);
  const unresolved = [...a, ...b].some((r) => r.unresolvedTie);
  return { pairs, unresolved };
}

export interface TeamBreakdown {
  teamId: number;
  byRound: [number, number, number];
  byType: Record<MatchType, number>;
  against: number;
}

/** Points per round and per match type for the final report. */
export function teamBreakdown(state: TournamentState, teamId: number): TeamBreakdown {
  const byRound: [number, number, number] = [0, 0, 0];
  const byType = Object.fromEntries(MATCH_TYPES.map((t) => [t, 0])) as Record<MatchType, number>;
  let against = 0;
  for (const d of state.duels) {
    const side = d.teamA === teamId ? "a" : d.teamB === teamId ? "b" : null;
    if (!side || d.teamA == null || d.teamB == null) continue;
    const other = side === "a" ? "b" : "a";
    for (const m of d.matches) {
      byRound[d.round - 1] += m.score[side];
      byType[m.type] += m.score[side];
      against += m.score[other];
    }
  }
  return { teamId, byRound, byType, against };
}
