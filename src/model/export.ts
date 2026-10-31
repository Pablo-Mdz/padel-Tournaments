import { t } from "../i18n/texts";
import { overallStandings, teamBreakdown } from "./standings";
import { courtLabelNumber, teamById } from "./tournament";
import { MATCH_TYPES, TournamentState } from "./types";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Final ranking 1–8 with points per round and per match type. */
export function standingsCsv(state: TournamentState): string {
  const header = [
    t.csv.rank,
    t.csv.team,
    t.csv.played,
    t.csv.won,
    t.csv.drawn,
    t.csv.lost,
    t.csv.pf,
    t.csv.pa,
    t.csv.diff,
    t.round(1),
    t.round(2),
    t.round(3),
    ...MATCH_TYPES.map((m) => t.matchTypes[m]),
  ];
  const rows = overallStandings(state).map((r) => {
    const team = teamById(state, r.teamId);
    const b = teamBreakdown(state, r.teamId);
    return [
      r.rank,
      team?.name ?? r.teamId,
      r.played,
      r.won,
      r.drawn,
      r.lost,
      r.pf,
      r.pa,
      r.diff,
      ...b.byRound,
      ...MATCH_TYPES.map((m) => b.byType[m]),
    ];
  });
  return toCsv([header, ...rows]);
}

/** Every single match of the tournament, one row each. */
export function matchesCsv(state: TournamentState): string {
  const header = [
    t.csv.round,
    t.csv.court,
    t.csv.match,
    t.csv.teamA,
    t.csv.teamB,
    t.csv.pointsA,
    t.csv.pointsB,
    t.csv.closed,
    t.csv.walkover,
  ];
  const rows: Array<Array<string | number>> = [];
  const duels = [...state.duels].sort((x, y) => x.round - y.round || x.courtIndex - y.courtIndex);
  for (const d of duels) {
    const a = teamById(state, d.teamA)?.name ?? "";
    const b = teamById(state, d.teamB)?.name ?? "";
    const wo = d.walkover === "a" ? a : d.walkover === "b" ? b : "";
    for (const m of d.matches) {
      rows.push([
        d.round,
        courtLabelNumber(state, d.courtIndex),
        t.matchTypes[m.type],
        a,
        b,
        m.score.a,
        m.score.b,
        m.closed ? t.csv.yes : t.csv.no,
        wo,
      ]);
    }
  }
  return toCsv([header, ...rows]);
}

/** Standings plus per-team breakdown as a readable JSON report. */
export function resultsJson(state: TournamentState): string {
  const report = overallStandings(state).map((r) => {
    const team = teamById(state, r.teamId);
    const b = teamBreakdown(state, r.teamId);
    return {
      rank: r.rank,
      teamId: r.teamId,
      team: team?.name,
      players: team?.players.map((p) => ({ name: p.name, gender: p.gender })),
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      pointsFor: r.pf,
      pointsAgainst: r.pa,
      difference: r.diff,
      pointsByRound: { round1: b.byRound[0], round2: b.byRound[1], round3: b.byRound[2] },
      pointsByMatchType: b.byType,
    };
  });
  return JSON.stringify({ event: state.settings, standings: report, tournament: state }, null, 2);
}
