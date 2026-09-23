import StandingsTable from "../components/StandingsTable";
import { t } from "../i18n/texts";
import { groupStandings, overallStandings } from "../model/standings";
import { GROUPS } from "../model/types";
import { useTournament } from "../store/store";

export default function StandingsPage() {
  const state = useTournament();
  return (
    <div className="flex flex-col gap-4">
      <section className="card p-3 ring-4 ring-brand sm:p-5">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-4">
          <h2 className="headline text-3xl sm:text-4xl">🏆 {t.standings.overallTitle}</h2>
          <p className="subline text-sm">{t.standings.overallHint}</p>
        </div>
        <StandingsTable state={state} rows={overallStandings(state)} context="overall" editable highlightLeader />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g} className="card p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-4">
              <h2 className="headline text-2xl sm:text-3xl">{t.standings.groupTitle(g)}</h2>
              <p className="subline text-xs">{t.standings.groupHint}</p>
            </div>
            <StandingsTable
              state={state}
              rows={groupStandings(state, g)}
              context={g === "A" ? "groupA" : "groupB"}
              editable
            />
          </section>
        ))}
      </div>
      <p className="text-xs text-white/60">{t.standings.legend}</p>
    </div>
  );
}
