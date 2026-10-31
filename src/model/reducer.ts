import { round3Pairings } from "./standings";
import { applyGroupSchedule, createInitialState, duelHasStarted, duelsOfRound, freshRoundClock } from "./tournament";
import {
  Duel,
  Gender,
  GroupId,
  Match,
  RankingContext,
  RoundClock,
  RoundNo,
  Settings,
  Side,
  TournamentState,
} from "./types";

export type Action =
  | { type: "setTeamName"; teamId: number; name: string }
  | { type: "setPlayer"; teamId: number; playerId: string; name?: string; gender?: Gender }
  | { type: "setTeamGroup"; teamId: number; group: GroupId }
  | { type: "updateSettings"; settings: Partial<Settings> }
  | { type: "addPoints"; duelId: string; matchIndex: number; side: Side; delta: number }
  | { type: "setScore"; duelId: string; matchIndex: number; a: number; b: number }
  | { type: "timerStart"; duelId: string; matchIndex: number }
  | { type: "timerPause"; duelId: string; matchIndex: number }
  | { type: "timerReset"; duelId: string; matchIndex: number }
  | { type: "closeMatch"; duelId: string; matchIndex: number }
  | { type: "reopenMatch"; duelId: string; matchIndex: number }
  | { type: "closeDuel"; duelId: string }
  | { type: "reopenDuel"; duelId: string }
  | { type: "setWalkover"; duelId: string; side: Side | null }
  | { type: "closeRound"; round: RoundNo }
  | { type: "reopenRound"; round: RoundNo }
  | { type: "setRound3Team"; courtIndex: number; side: Side; teamId: number | null }
  | { type: "regenerateRound3" }
  | { type: "setManualOrder"; context: RankingContext; order: number[] }
  | { type: "clockStart"; round: RoundNo; minutes: number }
  | { type: "clockPause" }
  | { type: "clockReset" }
  | { type: "clockSetMinutes"; minutes: number }
  | { type: "clockRestore"; clock: RoundClock }
  | { type: "import"; state: TournamentState }
  | { type: "reset" };

function mapDuel(state: TournamentState, id: string, fn: (d: Duel) => Duel): TournamentState {
  return { ...state, duels: state.duels.map((d) => (d.id === id ? fn(d) : d)) };
}

function mapMatch(state: TournamentState, id: string, i: number, fn: (m: Match, d: Duel) => Match): TournamentState {
  return mapDuel(state, id, (d) => ({
    ...d,
    matches: d.matches.map((m, j) => (j === i ? fn(m, d) : m)),
  }));
}

function pauseTimer(m: Match, now: number): Match {
  if (m.timer.startedAt == null) return m;
  return { ...m, timer: { startedAt: null, elapsedMs: m.timer.elapsedMs + Math.max(0, now - m.timer.startedAt) } };
}

const clampScore = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

/**
 * Keeps the round 3 pairings up to date while round 2 is closed, the organiser
 * has not edited them by hand and no round 3 duel has started. This way a late
 * correction in rounds 1–2 is reflected automatically.
 */
export function syncRound3(state: TournamentState): TournamentState {
  if (!state.roundClosed[1] || state.round3Edited) return state;
  const r3 = duelsOfRound(state, 3);
  if (r3.some(duelHasStarted)) return state;
  const { pairs } = round3Pairings(state);
  let changed = false;
  const duels = state.duels.map((d) => {
    if (d.round !== 3) return d;
    const [teamA, teamB] = pairs[d.courtIndex] ?? [null, null];
    if (d.teamA === teamA && d.teamB === teamB) return d;
    changed = true;
    return { ...d, teamA, teamB };
  });
  return changed ? { ...state, duels } : state;
}

function apply(state: TournamentState, action: Action, now: number): TournamentState {
  switch (action.type) {
    case "setTeamName":
      return { ...state, teams: state.teams.map((t) => (t.id === action.teamId ? { ...t, name: action.name } : t)) };

    case "setPlayer":
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id !== action.teamId
            ? t
            : {
                ...t,
                players: t.players.map((p) =>
                  p.id !== action.playerId
                    ? p
                    : { ...p, name: action.name ?? p.name, gender: action.gender ?? p.gender },
                ),
              },
        ),
      };

    case "setTeamGroup": {
      const teams = state.teams.map((t) => (t.id === action.teamId ? { ...t, group: action.group } : t));
      return applyGroupSchedule({ ...state, teams });
    }

    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case "addPoints":
      return mapMatch(state, action.duelId, action.matchIndex, (m) => ({
        ...m,
        score: { ...m.score, [action.side]: clampScore(m.score[action.side] + action.delta) },
      }));

    case "setScore":
      return mapMatch(state, action.duelId, action.matchIndex, (m) => ({
        ...m,
        score: { a: clampScore(action.a), b: clampScore(action.b) },
      }));

    case "timerStart":
      return mapMatch(state, action.duelId, action.matchIndex, (m) =>
        m.timer.startedAt != null ? m : { ...m, timer: { ...m.timer, startedAt: now } },
      );

    case "timerPause":
      return mapMatch(state, action.duelId, action.matchIndex, (m) => pauseTimer(m, now));

    case "timerReset":
      return mapMatch(state, action.duelId, action.matchIndex, (m) => ({
        ...m,
        timer: { startedAt: null, elapsedMs: 0 },
      }));

    case "closeMatch":
      return mapMatch(state, action.duelId, action.matchIndex, (m) => ({ ...pauseTimer(m, now), closed: true }));

    case "reopenMatch":
      return mapDuel(state, action.duelId, (d) => ({
        ...d,
        closed: false,
        matches: d.matches.map((m, j) => (j === action.matchIndex ? { ...m, closed: false } : m)),
      }));

    case "closeDuel":
      return mapDuel(state, action.duelId, (d) => ({
        ...d,
        closed: true,
        matches: d.matches.map((m) => ({ ...pauseTimer(m, now), closed: true })),
      }));

    case "reopenDuel":
      return mapDuel(state, action.duelId, (d) => ({ ...d, closed: false }));

    case "setWalkover":
      return mapDuel(state, action.duelId, (d) => ({ ...d, walkover: action.side }));

    case "closeRound": {
      const r = action.round;
      const roundClosed = [...state.roundClosed] as TournamentState["roundClosed"];
      roundClosed[r - 1] = true;
      const duels = state.duels.map((d) =>
        d.round !== r || d.closed
          ? d
          : { ...d, closed: true, matches: d.matches.map((m) => ({ ...pauseTimer(m, now), closed: true })) },
      );
      return { ...state, roundClosed, duels };
    }

    case "reopenRound": {
      const roundClosed = [...state.roundClosed] as TournamentState["roundClosed"];
      roundClosed[action.round - 1] = false;
      return { ...state, roundClosed };
    }

    case "setRound3Team":
      return {
        ...state,
        round3Edited: true,
        duels: state.duels.map((d) =>
          d.round === 3 && d.courtIndex === action.courtIndex
            ? { ...d, [action.side === "a" ? "teamA" : "teamB"]: action.teamId }
            : d,
        ),
      };

    case "regenerateRound3": {
      const { pairs } = round3Pairings(state);
      return {
        ...state,
        round3Edited: false,
        duels: state.duels.map((d) => {
          if (d.round !== 3 || duelHasStarted(d)) return d;
          const [teamA, teamB] = pairs[d.courtIndex] ?? [null, null];
          return { ...d, teamA, teamB };
        }),
      };
    }

    case "setManualOrder":
      return { ...state, manualOrder: { ...state.manualOrder, [action.context]: action.order } };

    case "import":
      return action.state;

    case "clockStart": {
      const c = state.roundClock;
      if (c.startedAt != null) return state;
      // A fresh clock is tied to the round it is started for, with the length shown.
      const fresh = c.elapsedMs === 0;
      return {
        ...state,
        roundClock: fresh
          ? { startedAt: now, elapsedMs: 0, minutes: action.minutes, round: action.round }
          : { ...c, startedAt: now },
      };
    }
    case "clockPause": {
      const c = state.roundClock;
      if (c.startedAt == null) return state;
      return { ...state, roundClock: { ...c, startedAt: null, elapsedMs: c.elapsedMs + Math.max(0, now - c.startedAt) } };
    }
    case "clockReset": {
      const c = state.roundClock;
      if (c.startedAt == null && c.elapsedMs === 0 && c.minutes == null) return state;
      return { ...state, roundClock: freshRoundClock(c.round) };
    }
    case "clockSetMinutes": {
      const m = Math.round(action.minutes);
      if (!(m > 0) || state.roundClock.minutes === m) return state;
      return { ...state, roundClock: { ...state.roundClock, minutes: m } };
    }
    case "clockRestore":
      return { ...state, roundClock: action.clock };
    case "reset":
      return createInitialState(now);
  }
}

export function reducer(state: TournamentState, action: Action, now = Date.now()): TournamentState {
  const next = action.type === "import" ? action.state : syncRound3(apply(state, action, now));
  if (next === state) return state;
  // Always raise the revision above the previous one so other tabs pick up the change.
  return { ...next, rev: Math.max(state.rev, next.rev) + 1, updatedAt: now };
}
