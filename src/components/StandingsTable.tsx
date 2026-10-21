import { t } from "../i18n/texts";
import { StandingRow } from "../model/standings";
import { teamById } from "../model/tournament";
import { RankingContext, TournamentState } from "../model/types";
import { dispatch } from "../store/store";
import { Icon, Num, stagger } from "./ui";

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
  const pad = big ? "px-[1vw] py-[0.6vh]" : "px-2 py-2.5";
  const anyTie = rows.some((r) => r.unresolvedTie);
  const stat = `${pad} text-center tabular-nums text-ink2 ${big ? "text-[2.7vh]" : "text-[15px]"}`;
  const head = `${pad} whitespace-nowrap font-semibold text-ink2 ${big ? "text-[2vh]" : "text-[12px]"}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="uppercase tracking-[0.06em]">
              <th className={`${head} w-[1%] text-left`}>{t.standings.pos}</th>
              <th className={`${head} text-left`}>{t.standings.team}</th>
              {full && (
                <>
                  <th className={`${head} text-center`} title={t.csv.played}>
                    {t.standings.played}
                  </th>
                  <th className={`${head} text-center`} title={t.csv.won}>
                    {t.standings.won}
                  </th>
                  <th className={`${head} text-center`} title={t.csv.drawn}>
                    {t.standings.drawn}
                  </th>
                  <th className={`${head} text-center`} title={t.csv.lost}>
                    {t.standings.lost}
                  </th>
                </>
              )}
              <th className={`${head} text-right`} title={t.csv.pf}>
                {t.standings.pf}
              </th>
              <th className={`${head} text-center`} title={t.csv.pa}>
                {t.standings.pa}
              </th>
              <th className={`${head} text-center`} title={t.csv.diff}>
                {t.standings.diff}
              </th>
              {editable && <th className={head} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const team = teamById(state, r.teamId);
              const lead = !!highlightLeader && i === 0 && r.pf > 0;
              const canMove = editable && r.tiedWith.length > 1 && (r.unresolvedTie || r.manualTie);
              return (
                <tr
                  key={r.teamId}
                  style={stagger(i, 35)}
                  className={`anim-rise border-t hairline transition-colors ${
                    r.unresolvedTie ? "bg-bad/[0.08]" : lead ? "hi" : ""
                  }`}
                  title={r.unresolvedTie ? t.standings.tieUnresolved : undefined}
                >
                  <td className={`${pad} align-middle`}>
                    <span
                      className={`num grid place-items-center rounded-full ${
                        big ? "h-[4.4vh] w-[4.4vh] text-[2.5vh]" : "h-8 w-8 text-[15px]"
                      } ${
                        lead
                          ? "bg-yellow text-navy"
                          : r.unresolvedTie
                            ? "bg-bad text-white"
                            : i < 3 && r.pf > 0
                              ? "bg-tint text-on-tint"
                              : "bg-fill/[0.14] text-ink"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className={`${pad} max-w-0 w-full`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`truncate font-semibold ${big ? "text-[3.1vh]" : "text-[17px]"}`}>
                        {team?.name ?? `${t.team} ${r.teamId}`}
                      </span>
                      {lead && (
                        <Icon
                          name="trophy"
                          className={`shrink-0 text-ink ${big ? "h-[3vh] w-[3vh]" : "h-4 w-4"}`}
                          label={t.standings.champion}
                        />
                      )}
                      {r.unresolvedTie && (
                        <Icon name="alert" className={`shrink-0 text-bad ${big ? "h-[3vh] w-[3vh]" : "h-4 w-4"}`} />
                      )}
                    </div>
                    {r.manualTie && !big && <div className="text-[12px] text-ink2">{t.standings.tieManual}</div>}
                  </td>
                  {full && (
                    <>
                      <td className={stat}>{r.played}</td>
                      <td className={stat}>{r.won}</td>
                      <td className={stat}>{r.drawn}</td>
                      <td className={stat}>{r.lost}</td>
                    </>
                  )}
                  <td className={`${pad} text-right`}>
                    <Num value={r.pf} className={`text-ink ${big ? "text-[3.9vh]" : "text-[24px]"}`} />
                  </td>
                  <td className={stat}>{r.pa}</td>
                  <td className={`${stat} font-semibold ${r.diff > 0 ? "!text-good" : ""}`}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff}
                  </td>
                  {editable && (
                    <td className={`${pad} text-right`}>
                      {canMove && (
                        <span className="inline-flex gap-1.5">
                          <button
                            className="icon-btn"
                            aria-label={t.standings.moveUp}
                            disabled={!rows[i - 1]?.tiedWith.includes(r.teamId)}
                            onClick={() => move(rows, context, i, -1)}
                          >
                            <Icon name="chevronUp" className="h-4 w-4" />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={t.standings.moveDown}
                            disabled={!rows[i + 1]?.tiedWith.includes(r.teamId)}
                            onClick={() => move(rows, context, i, 1)}
                          >
                            <Icon name="chevronDown" className="h-4 w-4" />
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
      </div>
      {anyTie && !big && (
        <div className="flex items-center gap-2 rounded-xl bg-bad/10 px-3 py-2 text-[14px] font-medium text-bad">
          <Icon name="alert" className="h-4 w-4" />
          {t.standings.tieUnresolved}
        </div>
      )}
    </div>
  );
}
