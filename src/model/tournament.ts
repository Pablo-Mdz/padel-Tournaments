import {
  Duel,
  MATCH_TYPES,
  Match,
  Player,
  RoundClock,
  RoundNo,
  Settings,
  Team,
  TeamCount,
  TournamentState,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  title: "Padel Team Challenge",
  subtitle: "4PADEL Berlin",
  date: "Saturday, 31.10.2026",
  teamCount: 8,
  courts: [2, 3, 4, 5],
  matchMinutes: [15, 15, 20],
  schedule: [
    { from: "11:45", to: "12:00", label: "Check-in" },
    { from: "12:00", to: "13:00", label: "Round 1" },
    { from: "13:00", to: "13:15", label: "Break" },
    { from: "13:15", to: "14:15", label: "Round 2" },
    { from: "14:15", to: "14:30", label: "Break & standings" },
    { from: "14:30", to: "15:50", label: "Round 3" },
    { from: "15:50", to: "16:00", label: "Award ceremony" },
  ],
};

/** Two teams per duel, one duel per court. */
export const courtCount = (teamCount: number): number => Math.floor(teamCount / 2);

export function createTeam(id: number): Team {
  const players: Player[] = [
    { id: `t${id}p1`, name: "Woman 1", gender: "F" },
    { id: `t${id}p2`, name: "Woman 2", gender: "F" },
    { id: `t${id}p3`, name: "Man 1", gender: "M" },
    { id: `t${id}p4`, name: "Man 2", gender: "M" },
  ];
  return { id, name: `Team ${id}`, players };
}

export function createTeams(count: TeamCount): Team[] {
  return Array.from({ length: count }, (_, i) => createTeam(i + 1));
}

/** Court numbers for `count` courts: keeps the ones already chosen, numbers the rest on. */
export function fitCourts(courts: number[], count: number): number[] {
  const out = courts.slice(0, count);
  while (out.length < count) out.push((out[out.length - 1] ?? 1) + 1);
  return out;
}

export function emptyMatches(): Match[] {
  return MATCH_TYPES.map((type) => ({
    type,
    score: { a: 0, b: 0 },
    closed: false,
  }));
}

function emptyDuel(round: RoundNo, courtIndex: number): Duel {
  return {
    id: `r${round}c${courtIndex}`,
    round,
    courtIndex,
    teamA: null,
    teamB: null,
    matches: emptyMatches(),
    closed: false,
    walkover: null,
  };
}

type Pair = [number, number];

/**
 * Qualifying schedule for rounds 1 and 2, for any even number of teams.
 *
 * Round 1 pairs neighbours: 1v2, 3v4, 5v6, …
 * Round 2 re-pairs those pairs across each other so nobody meets the same
 * opponent twice. Pairs are taken two at a time; an odd pair left over joins
 * the last two in a three-way rotation.
 */
export function schedulePairings(teamIds: number[], round: 1 | 2): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < teamIds.length; i += 2) pairs.push([teamIds[i], teamIds[i + 1]]);
  if (round === 1) return pairs;

  const out: Pair[] = [];
  for (let i = 0; i < pairs.length; ) {
    const left = pairs.length - i;
    if (left === 3) {
      const [p, q, r] = [pairs[i], pairs[i + 1], pairs[i + 2]];
      out.push([p[0], q[0]], [p[1], r[0]], [q[1], r[1]]);
      i += 3;
    } else if (left >= 2) {
      const [p, q] = [pairs[i], pairs[i + 1]];
      out.push([p[0], q[0]], [p[1], q[1]]);
      i += 2;
    } else {
      // A single pair left (only with 2 teams in total): they play again.
      out.push(pairs[i]);
      i += 1;
    }
  }
  return out;
}

/** Team ids in playing order. */
export function teamIds(state: TournamentState): number[] {
  return state.teams.map((t) => t.id).sort((x, y) => x - y);
}

/** One empty duel per round and court. */
export function emptyDuels(teamCount: number): Duel[] {
  const duels: Duel[] = [];
  for (const round of [1, 2, 3] as RoundNo[]) {
    for (let c = 0; c < courtCount(teamCount); c++) duels.push(emptyDuel(round, c));
  }
  return duels;
}

export function createInitialState(now = Date.now(), teamCount: TeamCount = DEFAULT_SETTINGS.teamCount): TournamentState {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.teamCount = teamCount;
  settings.courts = fitCourts(settings.courts, courtCount(teamCount));
  const state: TournamentState = {
    version: 1,
    rev: 0,
    updatedAt: now,
    settings,
    teams: createTeams(teamCount),
    duels: emptyDuels(teamCount),
    roundClosed: [false, false, false],
    round3Edited: false,
    manualOrder: {},
    roundClock: freshRoundClock(1),
  };
  return applySchedule(state);
}

export function duelHasStarted(d: Duel): boolean {
  return d.closed || d.matches.some((m) => m.closed || m.score.a > 0 || m.score.b > 0);
}

/**
 * Rebuilds the round 1–2 pairings from the list of teams.
 * Duels that already started are left untouched.
 */
export function applySchedule(state: TournamentState): TournamentState {
  const ids = teamIds(state);
  const byRound = { 1: schedulePairings(ids, 1), 2: schedulePairings(ids, 2) };
  const duels = state.duels.map((d) => {
    if (d.round === 3 || duelHasStarted(d)) return d;
    const pair = byRound[d.round as 1 | 2][d.courtIndex];
    return { ...d, teamA: pair?.[0] ?? null, teamB: pair?.[1] ?? null };
  });
  return { ...state, duels };
}

export function duelsOfRound(state: TournamentState, round: RoundNo): Duel[] {
  return state.duels.filter((d) => d.round === round).sort((x, y) => x.courtIndex - y.courtIndex);
}

export function duelTotals(d: Duel): { a: number; b: number } {
  return d.matches.reduce((acc, m) => ({ a: acc.a + m.score.a, b: acc.b + m.score.b }), { a: 0, b: 0 });
}

/** Index of the running match (first not closed); -1 when all are done. */
export function currentMatchIndex(d: Duel): number {
  return d.matches.findIndex((m) => !m.closed);
}

export type Leader = "a" | "b" | "draw";

export function leader(score: { a: number; b: number }): Leader {
  if (score.a > score.b) return "a";
  if (score.b > score.a) return "b";
  return "draw";
}

export function teamById(state: TournamentState, id: number | null): Team | undefined {
  return id == null ? undefined : state.teams.find((t) => t.id === id);
}

export function courtLabelNumber(state: TournamentState, courtIndex: number): number {
  return state.settings.courts[courtIndex] ?? courtIndex + 2;
}

/** Checks the 2 women + 2 men rule. */
export function lineupValid(team: Team): boolean {
  const f = team.players.filter((p) => p.gender === "F").length;
  const m = team.players.filter((p) => p.gender === "M").length;
  return team.players.length === 4 && f === 2 && m === 2;
}

/**
 * Which players of a team play which match.
 * Women: both women, Men: both men, Mixed 1: man 1 + woman 1, Mixed 2: man 2 + woman 2.
 * With an incomplete line-up (e.g. injury) the available names are shown; nothing blocks.
 */
export function lineup(team: Team | undefined, matchIndex: number): string[] {
  if (!team) return [];
  const women = team.players.filter((p) => p.gender === "F").map((p) => p.name);
  const men = team.players.filter((p) => p.gender === "M").map((p) => p.name);
  switch (MATCH_TYPES[matchIndex]) {
    case "women":
      return women.slice(0, 2);
    case "men":
      return men.slice(0, 2);
    case "mixed1":
      return [men[0], women[0]].filter((n): n is string => !!n);
    case "mixed2":
      return [men[1], women[1]].filter((n): n is string => !!n);
    default:
      return [];
  }
}

export function timerElapsedMs(t: { startedAt: number | null; elapsedMs: number }, now: number): number {
  return t.elapsedMs + (t.startedAt != null ? Math.max(0, now - t.startedAt) : 0);
}

/** Round currently being played: first one not closed (otherwise 3). */
export function activeRound(state: TournamentState): RoundNo {
  const idx = state.roundClosed.findIndex((c) => !c);
  return (idx === -1 ? 3 : idx + 1) as RoundNo;
}

export function freshRoundClock(round: RoundNo): RoundClock {
  return { startedAt: null, elapsedMs: 0, minutes: null, round };
}

/** True once the round clock was started (running or paused with time on it). */
export function roundClockTouched(c: RoundClock): boolean {
  return c.startedAt != null || c.elapsedMs > 0;
}

/**
 * Length of the round clock. An untouched clock follows the round on screen
 * (15 min, round 3: 20 min) unless a length was picked by hand.
 */
export function roundClockMinutes(state: TournamentState, viewedRound?: RoundNo): number {
  const c = state.roundClock;
  const round = roundClockTouched(c) || viewedRound == null ? c.round : viewedRound;
  return c.minutes ?? state.settings.matchMinutes[round - 1];
}
