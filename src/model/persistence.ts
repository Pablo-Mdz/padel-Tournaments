import { DEFAULT_SETTINGS, courtCount, emptyMatches, fitCourts } from "./tournament";
import { Duel, MATCH_TYPES, Settings, TEAM_COUNTS, Team, TeamCount, TournamentState } from "./types";

export const STORAGE_KEY = "padel-team-challenge:v1";

export class BackupError extends Error {}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback = 0) => (typeof x === "number" && Number.isFinite(x) ? x : fallback);

/**
 * Parses and validates a backup (or the localStorage snapshot).
 * Throws `BackupError` when the data is not a tournament; fills in missing
 * optional fields so older/partial files still load.
 */
export function parseState(raw: string | unknown): TournamentState {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new BackupError("invalid-json");
    }
  }
  // Backups are wrapped as { app, exportedAt, state }; accept the bare state too.
  if (isObj(data) && isObj(data.state)) data = data.state;
  if (!isObj(data) || data.version !== 1 || !Array.isArray(data.teams) || !Array.isArray(data.duels)) {
    throw new BackupError("not-a-tournament");
  }

  const teams: Team[] = data.teams.map((t: unknown) => {
    if (!isObj(t) || typeof t.id !== "number" || !Array.isArray(t.players)) throw new BackupError("bad-team");
    return {
      id: t.id,
      name: String(t.name ?? `Team ${t.id}`),
      players: t.players.map((p: unknown, i: number) => {
        const pp = isObj(p) ? p : {};
        return {
          id: String(pp.id ?? `t${t.id}p${i + 1}`),
          name: String(pp.name ?? ""),
          gender: pp.gender === "M" ? "M" : "F",
        };
      }),
    };
  });

  const duels: Duel[] = data.duels.map((d: unknown) => {
    if (!isObj(d) || typeof d.id !== "string" || ![1, 2, 3].includes(d.round as number)) {
      throw new BackupError("bad-duel");
    }
    const base = emptyMatches();
    const matches = Array.isArray(d.matches) ? d.matches : [];
    return {
      id: d.id,
      round: d.round as Duel["round"],
      courtIndex: num(d.courtIndex),
      teamA: typeof d.teamA === "number" ? d.teamA : null,
      teamB: typeof d.teamB === "number" ? d.teamB : null,
      closed: d.closed === true,
      walkover: d.walkover === "a" || d.walkover === "b" ? d.walkover : null,
      matches: base.map((_, i) => {
        const src = isObj(matches[i]) ? (matches[i] as Record<string, unknown>) : {};
        const score = isObj(src.score) ? src.score : {};
        return {
          type: MATCH_TYPES[i],
          score: { a: Math.max(0, num(score.a)), b: Math.max(0, num(score.b)) },
          closed: src.closed === true,
        };
      }),
    };
  });

  const s = isObj(data.settings) ? data.settings : {};
  // Older files have no team count; the teams they carry say how many there are.
  const teamCount = (TEAM_COUNTS.find((n) => n === s.teamCount) ??
    TEAM_COUNTS.find((n) => n === teams.length) ??
    DEFAULT_SETTINGS.teamCount) as TeamCount;
  const rc = Array.isArray(data.roundClosed) ? data.roundClosed : [];
  const mm = Array.isArray(s.matchMinutes) ? s.matchMinutes : [];
  return {
    version: 1,
    rev: num(data.rev),
    updatedAt: num(data.updatedAt),
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      teamCount,
      courts: fitCourts(
        Array.isArray(s.courts) && s.courts.every((c) => typeof c === "number")
          ? (s.courts as number[])
          : [...DEFAULT_SETTINGS.courts],
        courtCount(teamCount),
      ),
      matchMinutes: [0, 1, 2].map((i) => num(mm[i], DEFAULT_SETTINGS.matchMinutes[i])) as [number, number, number],
      schedule: Array.isArray(s.schedule) ? (s.schedule as Settings["schedule"]) : DEFAULT_SETTINGS.schedule,
    } as TournamentState["settings"],
    teams,
    duels,
    roundClosed: [rc[0] === true, rc[1] === true, rc[2] === true],
    round3Edited: data.round3Edited === true,
    manualOrder: isObj(data.manualOrder) ? (data.manualOrder as TournamentState["manualOrder"]) : {},
    roundClock: parseRoundClock(data.roundClock),
  };
}

export function serializeBackup(state: TournamentState, now = new Date()): string {
  return JSON.stringify({ app: "padel-team-challenge", exportedAt: now.toISOString(), state }, null, 2);
}

function parseRoundClock(raw: unknown): TournamentState["roundClock"] {
  const c = isObj(raw) ? raw : {};
  const round = c.round === 2 || c.round === 3 ? c.round : 1;
  return {
    startedAt: typeof c.startedAt === "number" && Number.isFinite(c.startedAt) ? c.startedAt : null,
    elapsedMs: typeof c.elapsedMs === "number" && c.elapsedMs > 0 ? c.elapsedMs : 0,
    minutes: typeof c.minutes === "number" && c.minutes > 0 ? c.minutes : null,
    round,
  };
}
