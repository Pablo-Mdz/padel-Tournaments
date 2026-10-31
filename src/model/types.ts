// Tournament data model. Everything that is persisted lives in `TournamentState`.

export type Gender = "F" | "M";
export type GroupId = "A" | "B";
export type RoundNo = 1 | 2 | 3;
export type Side = "a" | "b";

/** Order of the four matches of a duel. */
export const MATCH_TYPES = ["women", "men", "mixed1", "mixed2"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const ROUNDS: readonly RoundNo[] = [1, 2, 3];
export const GROUPS: readonly GroupId[] = ["A", "B"];

export interface Player {
  id: string;
  name: string;
  gender: Gender;
}

export interface Team {
  /** Fixed team number 1–8. Names may change, the id never does. */
  id: number;
  name: string;
  group: GroupId;
  players: Player[];
}

export interface Timer {
  /** Timestamp (ms) since the clock is running; `null` = paused/stopped. */
  startedAt: number | null;
  /** Time already elapsed before the last start (ms). */
  elapsedMs: number;
}

export interface Match {
  type: MatchType;
  score: { a: number; b: number };
  closed: boolean;
  timer: Timer;
}

export interface Duel {
  id: string;
  round: RoundNo;
  /** Index 0–3 into `settings.courts` – never the displayed number. */
  courtIndex: number;
  teamA: number | null;
  teamB: number | null;
  matches: Match[];
  closed: boolean;
  /** Side that did not show up; the result is then entered by hand. */
  walkover: Side | null;
}

export interface ScheduleItem {
  from: string;
  to: string;
  label: string;
}

export interface Settings {
  title: string;
  subtitle: string;
  date: string;
  /** Real court numbers of the club. */
  courts: number[];
  /** Match length in minutes per round (index 0 = round 1). */
  matchMinutes: [number, number, number];
  schedule: ScheduleItem[];
}

/** Contexts in which the organiser breaks ties by hand. */
export type RankingContext = "groupA" | "groupB" | "overall";

export interface TournamentState {
  version: 1;
  /** Incremented on every change (sync between tabs). */
  rev: number;
  updatedAt: number;
  settings: Settings;
  teams: Team[];
  duels: Duel[];
  roundClosed: [boolean, boolean, boolean];
  /** true once the round 3 pairings were edited by hand. */
  round3Edited: boolean;
  /** Manual order (team ids), used as the last tie-breaker. */
  manualOrder: Partial<Record<RankingContext, number[]>>;
  /** Countdown for the round on all courts – run by the organiser, shown to everyone. */
  roundClock: RoundClock;
}

export interface RoundClock {
  startedAt: number | null;
  elapsedMs: number;
  /** Chosen length; null = the round's default from the settings. */
  minutes: number | null;
  /** Round the clock is running (or last ran) for. */
  round: RoundNo;
}
