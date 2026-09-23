import {
  Duel,
  GroupId,
  MATCH_TYPES,
  Match,
  Player,
  RoundNo,
  Settings,
  Team,
  TournamentState,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  title: "Padel Team Challenge",
  subtitle: "4PADEL Berlin",
  date: "Saturday, 31.10.2026",
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

export function createTeams(): Team[] {
  return Array.from({ length: 8 }, (_, i) => {
    const id = i + 1;
    const players: Player[] = [
      { id: `t${id}p1`, name: "Woman 1", gender: "F" },
      { id: `t${id}p2`, name: "Woman 2", gender: "F" },
      { id: `t${id}p3`, name: "Man 1", gender: "M" },
      { id: `t${id}p4`, name: "Man 2", gender: "M" },
    ];
    return { id, name: `Team ${id}`, group: id <= 4 ? "A" : "B", players };
  });
}

export function emptyMatches(): Match[] {
  return MATCH_TYPES.map((type) => ({
    type,
    score: { a: 0, b: 0 },
    closed: false,
    timer: { startedAt: null, elapsedMs: 0 },
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

/** Teams of a group, sorted by team number (= slot 1–4 in the group schedule). */
export function groupMembers(teams: Team[], group: GroupId): number[] {
  return teams
    .filter((t) => t.group === group)
    .map((t) => t.id)
    .sort((x, y) => x - y);
}

/**
 * Group schedule: round 1 = 1v2, 3v4; round 2 = 1v3, 2v4 (per group).
 * Group A plays on the first two courts, group B on the last two.
 */
export function groupPairings(teams: Team[], round: 1 | 2): Array<[number | null, number | null]> {
  const slots: Record<1 | 2, Array<[number, number]>> = {
    1: [
      [0, 1],
      [2, 3],
    ],
    2: [
      [0, 2],
      [1, 3],
    ],
  };
  const out: Array<[number | null, number | null]> = [];
  for (const g of ["A", "B"] as GroupId[]) {
    const m = groupMembers(teams, g);
    for (const [x, y] of slots[round]) out.push([m[x] ?? null, m[y] ?? null]);
  }
  return out;
}

export function createInitialState(now = Date.now()): TournamentState {
  const teams = createTeams();
  const duels: Duel[] = [];
  for (const round of [1, 2, 3] as RoundNo[]) {
    for (let c = 0; c < 4; c++) duels.push(emptyDuel(round, c));
  }
  const state: TournamentState = {
    version: 1,
    rev: 0,
    updatedAt: now,
    settings: structuredClone(DEFAULT_SETTINGS),
    teams,
    duels,
    roundClosed: [false, false, false],
    round3Edited: false,
    manualOrder: {},
  };
  return applyGroupSchedule(state);
}

export function duelHasStarted(d: Duel): boolean {
  return (
    d.closed ||
    d.matches.some(
      (m) => m.closed || m.score.a > 0 || m.score.b > 0 || m.timer.elapsedMs > 0 || m.timer.startedAt !== null,
    )
  );
}

/**
 * Rebuilds the round 1–2 pairings from the group assignment.
 * Duels that already started are left untouched.
 */
export function applyGroupSchedule(state: TournamentState): TournamentState {
  const duels = state.duels.map((d) => {
    if (d.round === 3 || duelHasStarted(d)) return d;
    const [teamA, teamB] = groupPairings(state.teams, d.round as 1 | 2)[d.courtIndex];
    return { ...d, teamA, teamB };
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
