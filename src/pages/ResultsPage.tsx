import { Icon, Notice, Num, PageTitle, stagger } from "../components/ui";
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
  const th = "whitespace-nowrap px-2 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink2";
  const td = "px-2 py-3 text-center tabular-nums text-[15px] text-ink2";

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t.results.title} subtitle={`${t.results.byRound} · ${t.results.byType}`}>
        <button
          className="btn-tint"
          onClick={() => downloadFile(`team-challenge-standings_${stamp}.csv`, standingsCsv(state), "text/csv;charset=utf-8")}
        >
          <Icon name="download" className="h-[18px] w-[18px]" />
          {t.results.exportCsv}
        </button>
        <button
          className="btn-gray"
          onClick={() => downloadFile(`team-challenge-matches_${stamp}.csv`, matchesCsv(state), "text/csv;charset=utf-8")}
        >
          {t.results.exportMatchesCsv}
        </button>
        <button
          className="btn-gray"
          onClick={() => downloadFile(`team-challenge-results_${stamp}.json`, resultsJson(state), "application/json")}
        >
          {t.results.exportJson}
        </button>
      </PageTitle>

      {!final && <Notice tone="info">{t.results.provisional}</Notice>}

      <div className="card overflow-x-auto p-2 sm:p-3">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th className={`${th} text-left`}>{t.standings.pos}</th>
              <th className={`${th} text-left`}>{t.standings.team}</th>
              <th className={`${th} text-right`}>{t.results.total}</th>
              <th className={th}>{t.round(1)}</th>
              <th className={th}>{t.round(2)}</th>
              <th className={th}>{t.round(3)}</th>
              {MATCH_TYPES.map((m) => (
                <th key={m} className={th}>
                  {t.matchTypes[m]}
                </th>
              ))}
              <th className={th}>{t.mixed}</th>
              <th className={th}>{t.results.against}</th>
              <th className={th}>{t.standings.diff}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const team = teamById(state, r.teamId);
              const b = teamBreakdown(state, r.teamId);
              const top = i === 0 && r.pf > 0;
              return (
                <tr
                  key={r.teamId}
                  style={stagger(i, 35)}
                  className={`anim-rise border-t hairline ${r.unresolvedTie ? "bg-bad/[0.08]" : top ? "hi" : ""}`}
                >
                  <td className="px-2 py-3">
                    <span
                      className={`num grid h-9 w-9 place-items-center rounded-full text-[16px] ${
                        top ? "bg-yellow text-navy" : i < 3 && r.pf > 0 ? "bg-tint text-on-tint" : "bg-fill/[0.14]"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 text-[17px] font-semibold">
                      {team?.name}
                      {top && <Icon name="trophy" className="h-4 w-4" label={t.standings.champion} />}
                    </div>
                    <div className="text-[13px] text-ink2">
                      {t.group(team?.group ?? "")} · {team?.players.map((p) => p.name).join(", ")}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Num value={r.pf} className="text-[26px]" />
                  </td>
                  {b.byRound.map((p, k) => (
                    <td key={k} className={td}>
                      {p}
                    </td>
                  ))}
                  {MATCH_TYPES.map((m) => (
                    <td key={m} className={td}>
                      {b.byType[m]}
                    </td>
                  ))}
                  <td className={`${td} font-semibold text-ink`}>{b.byType.mixed1 + b.byType.mixed2}</td>
                  <td className={td}>{r.pa}</td>
                  <td className={`${td} font-semibold ${r.diff > 0 ? "!text-good" : ""}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.unresolvedTie) && <Notice tone="bad">{t.standings.tieUnresolved}</Notice>}
    </div>
  );
}
