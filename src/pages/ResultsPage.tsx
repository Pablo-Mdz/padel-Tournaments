import { downloadFile, timestamp } from "../download";
import { t } from "../i18n/texts";
import { matchesCsv, resultsJson, standingsCsv } from "../model/export";
import { overallStandings, teamBreakdown } from "../model/standings";
import { teamById } from "../model/tournament";
import { MATCH_TYPES } from "../model/types";
import { useTournament } from "../store/store";

export default function ResultsPage() {
  const state = useTournament();
  const rows = overallStandings(state);
  const final = state.roundClosed[2];
  const stamp = timestamp();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="headline mr-auto text-3xl sm:text-4xl">{t.results.title}</h2>
        <button
          className="btn-primary"
          onClick={() => downloadFile(`team-challenge-standings_${stamp}.csv`, standingsCsv(state), "text/csv;charset=utf-8")}
        >
          ⬇ {t.results.exportCsv}
        </button>
        <button
          className="btn-secondary"
          onClick={() => downloadFile(`team-challenge-matches_${stamp}.csv`, matchesCsv(state), "text/csv;charset=utf-8")}
        >
          ⬇ {t.results.exportMatchesCsv}
        </button>
        <button
          className="btn-secondary"
          onClick={() => downloadFile(`team-challenge-results_${stamp}.json`, resultsJson(state), "application/json")}
        >
          ⬇ {t.results.exportJson}
        </button>
      </div>
      {!final && <p className="rounded-lg bg-accent/20 px-3 py-2 text-accent">{t.results.provisional}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-1 text-base sm:text-lg">
          <thead>
            <tr className="subline text-xs sm:text-sm">
              <th className="px-2 text-left">{t.standings.pos}</th>
              <th className="px-2 text-left">{t.standings.team}</th>
              <th className="px-2">{t.results.total}</th>
              <th className="px-2">{t.round(1)}</th>
              <th className="px-2">{t.round(2)}</th>
              <th className="px-2">{t.round(3)}</th>
              {MATCH_TYPES.map((m) => (
                <th key={m} className="px-2">
                  {t.matchTypes[m]}
                </th>
              ))}
              <th className="px-2">{t.mixed}</th>
              <th className="px-2">{t.results.against}</th>
              <th className="px-2">{t.standings.diff}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const team = teamById(state, r.teamId);
              const b = teamBreakdown(state, r.teamId);
              const top = i === 0 && r.pf > 0;
              return (
                <tr key={r.teamId} className={top ? "bg-brand text-navy" : r.unresolvedTie ? "bg-red-700/70" : "bg-surface/90"}>
                  <td className={`score rounded-l-xl px-2 py-2 text-3xl ${top ? "" : "text-brand"}`}>{r.rank}</td>
                  <td className="px-2 py-2">
                    <div className="font-cond text-xl font-bold uppercase leading-tight">
                      {top && "🏆 "}
                      {team?.name}
                    </div>
                    <div className={`text-xs ${top ? "" : "text-accent"}`}>
                      {t.group(team?.group ?? "")} · {team?.players.map((p) => p.name).join(", ")}
                    </div>
                  </td>
                  <td className="score px-2 text-center text-3xl">{r.pf}</td>
                  {b.byRound.map((p, k) => (
                    <td key={k} className="px-2 text-center tabular-nums">
                      {p}
                    </td>
                  ))}
                  {MATCH_TYPES.map((m) => (
                    <td key={m} className="px-2 text-center tabular-nums">
                      {b.byType[m]}
                    </td>
                  ))}
                  <td className="px-2 text-center tabular-nums">{b.byType.mixed1 + b.byType.mixed2}</td>
                  <td className="px-2 text-center tabular-nums opacity-80">{r.pa}</td>
                  <td className="rounded-r-xl px-2 text-center tabular-nums">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.unresolvedTie) && (
        <p className="rounded-lg bg-red-700/60 px-3 py-2 text-sm font-semibold">⚠ {t.standings.tieUnresolved}</p>
      )}
    </div>
  );
}
