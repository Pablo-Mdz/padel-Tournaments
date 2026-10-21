import StandingsTable from "../components/StandingsTable";
import { Icon, PageTitle, stagger } from "../components/ui";
import { t } from "../i18n/texts";
import { groupStandings, overallStandings } from "../model/standings";
import { GROUPS } from "../model/types";
import { useReadOnly, useTournament } from "../store/store";

export default function StandingsPage() {
  const state = useTournament();
  const readOnly = useReadOnly();
  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t.nav.standings} subtitle={t.standings.overallHint} />

      <section className="card relative overflow-hidden p-4 sm:p-5">
        {/* A thin band in club yellow marks the table that decides the champion. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-yellow" />
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-yellow text-navy">
            <Icon name="trophy" className="h-[18px] w-[18px]" />
          </span>
          <h2 className="text-[22px] font-bold tracking-tight">{t.standings.overallTitle}</h2>
        </div>
        <StandingsTable state={state} rows={overallStandings(state)} context="overall" editable={!readOnly} highlightLeader />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {GROUPS.map((g, i) => (
          <section key={g} className="card anim-rise p-4 sm:p-5" style={stagger(i + 2, 80)}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="text-[22px] font-bold tracking-tight">{t.standings.groupTitle(g)}</h2>
              <span className="text-[13px] text-ink2">{t.standings.groupHint}</span>
            </div>
            <StandingsTable
              state={state}
              rows={groupStandings(state, g)}
              context={g === "A" ? "groupA" : "groupB"}
              editable={!readOnly}
            />
          </section>
        ))}
      </div>
      <p className="px-1 text-[13px] text-ink2">{t.standings.legend}</p>
    </div>
  );
}
