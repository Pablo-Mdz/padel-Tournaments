import { t } from "../i18n/texts";
import { StandingRow } from "../model/standings";
import { teamById } from "../model/tournament";
import { RankingContext, TournamentState } from "../model/types";
import { dispatch } from "../store/store";

interface Props {
  state: TournamentState;
  rows: StandingRow[];
  context: RankingContext;
  /** Show the ▲▼ controls for tied teams. */
  editable?: boolean;
  /** Highlight the leader as champion (overall table). */
  highlightLeader?: boolean;
  /** Large type for the TV screen. */
  big?: boolean;
  /** Columns to show. */
  columns?: "full" | "points";
}

/** Swaps a team with its neighbour inside a tie and stores the order as manual tie-breaker. */
function move(rows: StandingRow[], context: RankingContext, index: number, dir: -1 | 1) {
  const other = index + dir;
  if (other < 0 || other >= rows.length) return;
  if (!rows[index].tiedWith.includes(rows[other].teamId)) return;
  const order = rows.map((r) => r.teamId);
  [order[index], order[other]] = [order[other], order[index]];
  dispatch({ type: "setManualOrder", context, order });
}

export default function StandingsTable({
  state,
  rows,
  context,
  editable,
  highlightLeader,
  big,
  columns = "full",
}: Props) {
  const full = columns === "full";
  const cell = big ? "px-[1.2vw] py-[0.5vh]" : "px-2 py-2";
  const text = big ? "text-[3.6vh]" : "text-base sm:text-lg";
  const anyTie = rows.some((r) => r.unresolvedTie);

  return (
    <div>
      <table className={`w-full border-separate border-spacing-y-1 ${text}`}>
        <thead>
          <tr className={`subline ${big ? "text-[2.4vh]" : "text-xs sm:text-sm"}`}>
            <th className={`${cell} text-left`}>{t.standings.pos}</th>
            <th className={`${cell} text-left`}>{t.standings.team}</th>
            {full && (
              <>
                <th className={cell}>{t.standings.played}</th>
                <th className={cell}>{t.standings.won}</th>
                <th className={cell}>{t.standings.drawn}</th>
                <th className={cell}>{t.standings.lost}</th>
              </>
            )}
            <th className={cell}>{t.standings.pf}</th>
            <th className={cell}>{t.standings.pa}</th>
            <th className={cell}>{t.standings.diff}</th>
            {editable && <th className={cell} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const team = teamById(state, r.teamId);
            const lead = highlightLeader && i === 0 && r.pf > 0;
            const rowBg = r.unresolvedTie
              ? "bg-red-700/70 ring-2 ring-red-400"
              : lead
                ? "bg-brand text-navy"
                : "bg-surface/90";
            const canMove = editable && r.tiedWith.length > 1 && (r.unresolvedTie || r.manualTie);
            return (
              <tr key={r.teamId} className={rowBg} title={r.unresolvedTie ? t.standings.tieUnresolved : undefined}>
                <td className={`${cell} score rounded-l-xl text-left ${lead ? "" : "text-brand"}`}>{r.rank}</td>
                <td className={`${cell} text-left font-cond font-bold uppercase leading-tight`}>
                  {lead && <span className="mr-2">🏆</span>}
                  {team?.name ?? `Team ${r.teamId}`}
                  {r.manualTie && !big && (
                    <span className={`ml-2 text-xs font-normal normal-case ${lead ? "" : "text-accent"}`}>
                      ({t.standings.tieManual})
                    </span>
                  )}
                </td>
                {full && (
                  <>
                    <td className={`${cell} text-center tabular-nums`}>{r.played}</td>
                    <td className={`${cell} text-center tabular-nums`}>{r.won}</td>
                    <td className={`${cell} text-center tabular-nums`}>{r.drawn}</td>
                    <td className={`${cell} text-center tabular-nums`}>{r.lost}</td>
                  </>
                )}
                <td className={`${cell} score text-center ${big ? "text-[4.6vh]" : "text-2xl"}`}>{r.pf}</td>
                <td className={`${cell} text-center tabular-nums opacity-80`}>{r.pa}</td>
                <td
                  className={`${cell} text-center tabular-nums ${!editable ? "rounded-r-xl" : ""} ${
                    lead ? "" : r.diff > 0 ? "text-emerald-300" : r.diff < 0 ? "text-accent" : ""
                  }`}
                >
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                {editable && (
                  <td className={`${cell} rounded-r-xl text-right`}>
                    {canMove && (
                      <span className="inline-flex gap-1">
                        <button
                          className="btn-secondary min-h-[40px] px-3"
                          aria-label={t.standings.moveUp}
                          disabled={!rows[i - 1]?.tiedWith.includes(r.teamId)}
                          onClick={() => move(rows, context, i, -1)}
                        >
                          ▲
                        </button>
                        <button
                          className="btn-secondary min-h-[40px] px-3"
                          aria-label={t.standings.moveDown}
                          disabled={!rows[i + 1]?.tiedWith.includes(r.teamId)}
                          onClick={() => move(rows, context, i, 1)}
                        >
                          ▼
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {anyTie && !big && (
        <p className="mt-2 rounded-lg bg-red-700/60 px-3 py-2 text-sm font-semibold">⚠ {t.standings.tieUnresolved}</p>
      )}
    </div>
  );
}
