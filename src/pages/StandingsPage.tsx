import RoundClock from "../components/RoundClock";
import StandingsTable from "../components/StandingsTable";
import { Icon, PageTitle, stagger } from "../components/ui";
import { t } from "../i18n/texts";
import { overallStandings, qualifyingStandings } from "../model/standings";
import { useReadOnly, useTournament } from "../store/store";

export default function StandingsPage() {
  const state = useTournament();
  const readOnly = useReadOnly();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle title={t.nav.standings} subtitle={t.standings.overallHint} />
        {/* Time left in the round – view only here; the organiser runs it from Scoring. */}
        <div className="empty:hidden sm:w-[320px] sm:shrink-0">
          <RoundClock state={state} round={state.roundClock.round} readOnly />
        </div>
      </div>

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

      <section className="card anim-rise p-4 sm:p-5" style={stagger(2, 80)}>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-[22px] font-bold tracking-tight">{t.standings.qualifyingTitle}</h2>
          <span className="text-[13px] text-ink2">{t.standings.qualifyingHint}</span>
        </div>
        <StandingsTable state={state} rows={qualifyingStandings(state)} context="qualifying" editable={!readOnly} />
      </section>
      <p className="px-1 text-[13px] text-ink2">{t.standings.legend}</p>
    </div>
  );
}
