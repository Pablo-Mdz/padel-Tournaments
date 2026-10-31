import { describe, expect, it } from "vitest";
import { matchesCsv, standingsCsv } from "./export";
import { BackupError, parseState, serializeBackup } from "./persistence";
import { Action, reducer } from "./reducer";
import { groupStandings, overallStandings, round3Pairings, teamBreakdown } from "./standings";
import { createInitialState, duelTotals, duelsOfRound, lineup, lineupValid, roundClockMinutes } from "./tournament";
import { RoundNo, TournamentState } from "./types";

const NOW = 1_000_000;

function run(state: TournamentState, ...actions: Action[]): TournamentState {
  return actions.reduce((s, a) => reducer(s, a, NOW), state);
}

function duelId(state: TournamentState, round: RoundNo, courtIndex: number): string {
  return duelsOfRound(state, round)[courtIndex].id;
}

/** Sets the four match scores of a duel and closes it. */
function playDuel(
  state: TournamentState,
  round: RoundNo,
  courtIndex: number,
  scores: Array<[number, number]>,
): TournamentState {
  const id = duelId(state, round, courtIndex);
  const actions: Action[] = scores.map(([a, b], i) => ({ type: "setScore", duelId: id, matchIndex: i, a, b }));
  return run(state, ...actions, { type: "closeDuel", duelId: id });
}

/** Plays a duel where team A scores `a` and team B `b` in the first match only. */
const simple = (s: TournamentState, r: RoundNo, c: number, a: number, b: number) =>
  playDuel(s, r, c, [
    [a, b],
    [0, 0],
    [0, 0],
    [0, 0],
  ]);

describe("schedule", () => {
  it("builds rounds 1 and 2 inside the groups on the right courts", () => {
    const s = createInitialState(NOW);
    expect(duelsOfRound(s, 1).map((d) => [d.teamA, d.teamB])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    expect(duelsOfRound(s, 2).map((d) => [d.teamA, d.teamB])).toEqual([
      [1, 3],
      [2, 4],
      [5, 7],
      [6, 8],
    ]);
    expect(duelsOfRound(s, 3).every((d) => d.teamA === null && d.teamB === null)).toBe(true);
    expect(s.settings.courts).toEqual([2, 3, 4, 5]);
  });

  it("re-schedules unstarted duels when groups change, but keeps started ones", () => {
    let s = createInitialState(NOW);
    s = run(s, { type: "addPoints", duelId: duelId(s, 1, 0), matchIndex: 0, side: "a", delta: 1 });
    s = run(s, { type: "setTeamGroup", teamId: 4, group: "B" }, { type: "setTeamGroup", teamId: 5, group: "A" });
    expect([duelsOfRound(s, 1)[0].teamA, duelsOfRound(s, 1)[0].teamB]).toEqual([1, 2]); // started, untouched
    expect([duelsOfRound(s, 1)[1].teamA, duelsOfRound(s, 1)[1].teamB]).toEqual([3, 5]);
    expect([duelsOfRound(s, 1)[2].teamA, duelsOfRound(s, 1)[2].teamB]).toEqual([4, 6]);
  });
});

describe("scoring", () => {
  it("adds +1/+2, undoes −1, never goes below zero", () => {
    let s = createInitialState(NOW);
    const id = duelId(s, 1, 0);
    s = run(
      s,
      { type: "addPoints", duelId: id, matchIndex: 0, side: "a", delta: 1 },
      { type: "addPoints", duelId: id, matchIndex: 0, side: "a", delta: 2 },
      { type: "addPoints", duelId: id, matchIndex: 0, side: "a", delta: -1 },
      { type: "addPoints", duelId: id, matchIndex: 0, side: "b", delta: -1 },
    );
    const m = s.duels.find((d) => d.id === id)!.matches[0];
    expect(m.score).toEqual({ a: 2, b: 0 });
  });

  it("sums the four matches into the duel score", () => {
    let s = createInitialState(NOW);
    s = playDuel(s, 1, 0, [
      [10, 8],
      [5, 12],
      [7, 7],
      [9, 3],
    ]);
    expect(duelTotals(duelsOfRound(s, 1)[0])).toEqual({ a: 31, b: 30 });
  });

  it("keeps accepting points after a match is closed, so mistakes can be corrected", () => {
    let s = createInitialState(NOW);
    const id = duelId(s, 1, 0);
    s = run(s, { type: "closeMatch", duelId: id, matchIndex: 0 });
    s = run(s, { type: "addPoints", duelId: id, matchIndex: 0, side: "b", delta: 2 });
    const m = s.duels.find((d) => d.id === id)!.matches[0];
    expect(m.score.b).toBe(2);
    expect(m.closed).toBe(true);
  });

  it("drops the per-match timer that older saved data still carries", () => {
    const raw = JSON.parse(JSON.stringify(createInitialState(NOW)));
    raw.duels[0].matches[0].timer = { startedAt: 123, elapsedMs: 5000 };
    expect(parseState(raw).duels[0].matches[0]).not.toHaveProperty("timer");
  });

  it("bumps the revision on every change", () => {
    const s0 = createInitialState(NOW);
    const s1 = run(s0, { type: "setTeamName", teamId: 1, name: "Los Lobos" });
    expect(s1.rev).toBe(s0.rev + 1);
  });
});

describe("standings", () => {
  it("counts W/D/L only for closed duels but points live", () => {
    let s = createInitialState(NOW);
    const id = duelId(s, 1, 0);
    s = run(s, { type: "addPoints", duelId: id, matchIndex: 0, side: "a", delta: 2 });
    let row = overallStandings(s).find((r) => r.teamId === 1)!;
    expect(row).toMatchObject({ pf: 2, pa: 0, played: 0, won: 0 });
    s = run(s, { type: "closeDuel", duelId: id });
    row = overallStandings(s).find((r) => r.teamId === 1)!;
    expect(row).toMatchObject({ pf: 2, played: 1, won: 1 });
  });

  it("allows a drawn duel", () => {
    let s = createInitialState(NOW);
    s = simple(s, 1, 0, 20, 20);
    const g = groupStandings(s, "A");
    expect(g.find((r) => r.teamId === 1)).toMatchObject({ drawn: 1, won: 0, lost: 0 });
    expect(g.find((r) => r.teamId === 2)).toMatchObject({ drawn: 1, won: 0, lost: 0 });
  });

  it("ranks by points for, before duel wins", () => {
    let s = createInitialState(NOW);
    s = simple(s, 1, 0, 30, 29); // team 1 wins with 30
    s = simple(s, 1, 1, 40, 45); // team 4 wins with 45, team 3 loses with 40
    const g = groupStandings(s, "A").map((r) => r.teamId);
    expect(g).toEqual([4, 3, 1, 2]);
  });

  it("breaks equal points by point difference", () => {
    let s = createInitialState(NOW);
    s = simple(s, 1, 0, 30, 10); // team 1: 30 / +20
    s = simple(s, 1, 1, 30, 25); // team 3: 30 / +5
    expect(groupStandings(s, "A").map((r) => r.teamId)).toEqual([1, 3, 4, 2]);
  });

  it("breaks equal points and difference by head-to-head", () => {
    let s = createInitialState(NOW);
    // Round 1: 1–2 = 20:10, 3–4 = 10:20  → after R1 teams 1 and 4 have 20/+10
    s = simple(s, 1, 0, 20, 10);
    s = simple(s, 1, 1, 10, 20);
    // Round 2: 1–3 = 10:20 and 2–4 = 20:10 → totals: 1: 30/0, 2: 30/0, 3: 30/0, 4: 30/0
    s = simple(s, 2, 0, 10, 20);
    s = simple(s, 2, 1, 20, 10);
    const rows = groupStandings(s, "A");
    // All four level on 30/0; not every pair has met (1–4, 2–3 never played),
    // so the whole block stays unresolved.
    expect(rows.every((r) => r.pf === 30 && r.diff === 0)).toBe(true);
    expect(rows.every((r) => r.unresolvedTie)).toBe(true);
  });

  it("uses head-to-head for two tied teams that met", () => {
    // Direct scenario: 1 and 2 level on points and difference, 1 won their duel.
    let t = createInitialState(NOW);
    t = simple(t, 1, 0, 12, 10); // 1: 12/10, 2: 10/12
    t = simple(t, 2, 0, 8, 10); // 1: 20/20
    t = simple(t, 2, 1, 10, 8); // 2: 20/20
    const r2 = groupStandings(t, "A");
    const one = r2.findIndex((r) => r.teamId === 1);
    const two = r2.findIndex((r) => r.teamId === 2);
    expect(r2[one].pf).toBe(r2[two].pf);
    expect(r2[one].diff).toBe(r2[two].diff);
    expect(one).toBeLessThan(two);
    expect(r2[one].unresolvedTie).toBe(false);
  });

  it("flags a tie that cannot be broken and accepts a manual order", () => {
    let s = createInitialState(NOW);
    // 1 and 2 draw their duel with 10:10 → equal everything, head-to-head equal too.
    s = simple(s, 1, 0, 10, 10);
    let rows = groupStandings(s, "A");
    const tied = rows.filter((r) => r.unresolvedTie).map((r) => r.teamId);
    expect(tied).toEqual([1, 2]);
    expect(round3Pairings(s).unresolved).toBe(true);

    s = run(s, { type: "setManualOrder", context: "groupA", order: [2, 1] });
    rows = groupStandings(s, "A");
    expect(rows.slice(0, 2).map((r) => r.teamId)).toEqual([2, 1]);
    expect(rows[0].manualTie).toBe(true);
    expect(rows.some((r) => r.unresolvedTie && (r.teamId === 1 || r.teamId === 2))).toBe(false);
  });

  it("recalculates everything when a closed match is corrected", () => {
    let s = createInitialState(NOW);
    s = simple(s, 1, 0, 30, 10);
    expect(overallStandings(s)[0].teamId).toBe(1);
    s = run(s, { type: "setScore", duelId: duelId(s, 1, 0), matchIndex: 0, a: 10, b: 30 });
    expect(overallStandings(s)[0].teamId).toBe(2);
    expect(groupStandings(s, "A").find((r) => r.teamId === 2)).toMatchObject({ won: 1, pf: 30 });
  });
});

/** Plays rounds 1–2 with clear results so that group A ranks 1,2,3,4 and group B 8,7,6,5. */
function groupPhase(): TournamentState {
  let s = createInitialState(NOW);
  // Round 1: 1–2, 3–4, 5–6, 7–8
  s = simple(s, 1, 0, 50, 30);
  s = simple(s, 1, 1, 25, 20);
  s = simple(s, 1, 2, 10, 20);
  s = simple(s, 1, 3, 30, 40);
  // Round 2: 1–3, 2–4, 5–7, 6–8
  s = simple(s, 2, 0, 40, 30);
  s = simple(s, 2, 1, 30, 10);
  s = simple(s, 2, 2, 10, 30);
  s = simple(s, 2, 3, 20, 45);
  return s;
}

describe("round 3", () => {
  it("generates the cross pairings when round 2 is closed", () => {
    let s = groupPhase();
    expect(groupStandings(s, "A").map((r) => r.teamId)).toEqual([1, 2, 3, 4]);
    expect(groupStandings(s, "B").map((r) => r.teamId)).toEqual([8, 7, 6, 5]);
    expect(duelsOfRound(s, 3).every((d) => d.teamA === null)).toBe(true);

    s = run(s, { type: "closeRound", round: 1 }, { type: "closeRound", round: 2 });
    expect(duelsOfRound(s, 3).map((d) => [d.teamA, d.teamB])).toEqual([
      [1, 8],
      [2, 7],
      [3, 6],
      [4, 5],
    ]);
  });

  it("follows corrections in rounds 1–2 until round 3 starts or is edited", () => {
    let s = run(groupPhase(), { type: "closeRound", round: 1 }, { type: "closeRound", round: 2 });
    // Correction: team 4 actually scored 80 in round 2 → team 4 leads group A
    s = run(s, { type: "setScore", duelId: duelId(s, 2, 1), matchIndex: 0, a: 20, b: 80 });
    expect(groupStandings(s, "A")[0].teamId).toBe(4);
    expect([duelsOfRound(s, 3)[0].teamA, duelsOfRound(s, 3)[0].teamB]).toEqual([4, 8]);

    // Manual edit locks the pairings
    s = run(s, { type: "setRound3Team", courtIndex: 0, side: "b", teamId: 5 });
    s = run(s, { type: "setScore", duelId: duelId(s, 2, 1), matchIndex: 0, a: 20, b: 10 });
    expect([duelsOfRound(s, 3)[0].teamA, duelsOfRound(s, 3)[0].teamB]).toEqual([4, 5]);

    // Regenerate unlocks and recalculates
    s = run(s, { type: "regenerateRound3" });
    expect([duelsOfRound(s, 3)[0].teamA, duelsOfRound(s, 3)[0].teamB]).toEqual([1, 8]);
  });

  it("decides the champion by total points, not by the round 3 duel", () => {
    let s = run(groupPhase(), { type: "closeRound", round: 1 }, { type: "closeRound", round: 2 });
    // Team 1 has 90, team 8 has 85. Team 8 wins the final duel 12:10 but stays behind on total.
    s = simple(s, 3, 0, 10, 12);
    const top = overallStandings(s);
    expect(top[0].teamId).toBe(1);
    expect(top[0].pf).toBe(100);
    expect(top[1].teamId).toBe(8);
    expect(top[1].pf).toBe(97);
  });
});

describe("special cases", () => {
  it("walkover: marks the duel and takes a manual result", () => {
    let s = createInitialState(NOW);
    const id = duelId(s, 1, 1);
    s = run(
      s,
      { type: "setWalkover", duelId: id, side: "b" },
      { type: "setScore", duelId: id, matchIndex: 0, a: 20, b: 0 },
      { type: "closeDuel", duelId: id },
    );
    const d = s.duels.find((x) => x.id === id)!;
    expect(d.walkover).toBe("b");
    expect(groupStandings(s, "A").find((r) => r.teamId === 3)).toMatchObject({ won: 1, pf: 20 });
  });

  it("renaming teams and players keeps every point", () => {
    let s = simple(createInitialState(NOW), 1, 0, 30, 10);
    s = run(
      s,
      { type: "setTeamName", teamId: 1, name: "Smash Brothers" },
      { type: "setPlayer", teamId: 1, playerId: "t1p1", name: "Ana" },
    );
    expect(s.teams[0].name).toBe("Smash Brothers");
    expect(s.teams[0].players[0].name).toBe("Ana");
    expect(overallStandings(s)[0]).toMatchObject({ teamId: 1, pf: 30 });
  });

  it("warns about but tolerates wrong line-ups (e.g. injury)", () => {
    let s = createInitialState(NOW);
    expect(lineupValid(s.teams[0])).toBe(true);
    s = run(s, { type: "setPlayer", teamId: 1, playerId: "t1p2", gender: "M" });
    expect(lineupValid(s.teams[0])).toBe(false);
    expect(lineup(s.teams[0], 0)).toEqual(["Woman 1"]);
    s = run(s, { type: "addPoints", duelId: duelId(s, 1, 0), matchIndex: 0, side: "a", delta: 1 });
    expect(overallStandings(s)[0].pf).toBe(1);
  });

  it("gives the mixed line-ups", () => {
    const team = createInitialState(NOW).teams[0];
    expect(lineup(team, 1)).toEqual(["Man 1", "Man 2"]);
    expect(lineup(team, 2)).toEqual(["Man 1", "Woman 1"]);
    expect(lineup(team, 3)).toEqual(["Man 2", "Woman 2"]);
  });

  it("reset returns to a fresh tournament", () => {
    const s = run(simple(createInitialState(NOW), 1, 0, 30, 10), { type: "reset" });
    expect(overallStandings(s).every((r) => r.pf === 0)).toBe(true);
  });
});

describe("persistence & export", () => {
  it("round-trips a backup", () => {
    const s = run(groupPhase(), { type: "setTeamName", teamId: 3, name: 'Team "Drop", Shot' });
    const back = parseState(serializeBackup(s));
    expect(back).toEqual(s);
  });

  it("rejects garbage", () => {
    expect(() => parseState("nope")).toThrow(BackupError);
    expect(() => parseState(JSON.stringify({ foo: 1 }))).toThrow(BackupError);
  });

  it("breaks points down by round and match type", () => {
    let s = createInitialState(NOW);
    s = playDuel(s, 1, 0, [
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    s = simple(s, 2, 0, 5, 0);
    const b = teamBreakdown(s, 1);
    expect(b.byRound).toEqual([10, 5, 0]);
    expect(b.byType).toEqual({ women: 6, men: 2, mixed1: 3, mixed2: 4 });
  });

  it("exports CSV with escaping and real court numbers", () => {
    const s = run(simple(createInitialState(NOW), 1, 0, 30, 10), {
      type: "setTeamName",
      teamId: 1,
      name: 'A, "B"',
    });
    const st = standingsCsv(s).split("\r\n");
    expect(st[1]).toMatch(/^1,"A, ""B""",A,1,1,0,0,30,10,20,30,0,0,30,0,0,0$/);
    const mt = matchesCsv(s).split("\r\n");
    expect(mt[1].split(",")[1]).toBe("2");
    const courts = new Set(mt.slice(1, -1).map((l) => Number(l.split(",")[1])));
    expect([...courts].sort()).toEqual([2, 3, 4, 5]);
  });
});

describe("round clock", () => {
  it("is shared state: start, pause, length and reset", () => {
    let s = createInitialState(NOW);
    expect(roundClockMinutes(s, 3)).toBe(20);
    expect(roundClockMinutes(s, 1)).toBe(15);
    s = reducer(s, { type: "clockStart", round: 3, minutes: 20 }, NOW);
    expect(s.roundClock).toEqual({ startedAt: NOW, elapsedMs: 0, minutes: 20, round: 3 });
    // Once running, the clock keeps its own round whatever round is on screen.
    expect(roundClockMinutes(s, 1)).toBe(20);
    s = reducer(s, { type: "clockPause" }, NOW + 60_000);
    expect(s.roundClock.elapsedMs).toBe(60_000);
    s = reducer(s, { type: "clockSetMinutes", minutes: 15 }, NOW);
    expect(roundClockMinutes(s)).toBe(15);
    s = reducer(s, { type: "clockReset" }, NOW);
    expect(s.roundClock).toEqual({ startedAt: null, elapsedMs: 0, minutes: null, round: 3 });
    const back = parseState(JSON.stringify(s));
    expect(back.roundClock).toEqual(s.roundClock);
  });

  it("older saved data without a clock gets a fresh one", () => {
    const raw = JSON.parse(JSON.stringify(createInitialState(NOW)));
    delete raw.roundClock;
    expect(parseState(raw).roundClock).toEqual({ startedAt: null, elapsedMs: 0, minutes: null, round: 1 });
  });
});
