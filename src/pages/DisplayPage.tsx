import { useEffect, useState } from "react";
import CourtCard from "../components/CourtCard";
import StandingsTable from "../components/StandingsTable";
import { t } from "../i18n/texts";
import { groupStandings, overallStandings } from "../model/standings";
import { activeRound, duelsOfRound } from "../model/tournament";
import { GROUPS, TournamentState } from "../model/types";
import { goBack } from "../router";
import { useNow, useSessionState } from "../store/hooks";
import { useTournament } from "../store/store";

const SLIDE_MS = 15_000;
const SLIDES = ["live", "overall", "groups"] as const;

function currentScheduleItem(state: TournamentState, now: number) {
  const d = new Date(now);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return state.settings.schedule.find((s) => s.from <= hm && hm < s.to);
}

/** TV screen: no controls, big type, rotates every 15 s, live-synced with the scoring tablet. */
export default function DisplayPage() {
  const state = useTournament();
  const now = useNow(500);
  // Kept per tab so the rotation continues when the page reloads with new results.
  const [slide, setSlide] = useSessionState("ui:slide", 0);
  // The TV screen has no controls; a tap, mouse move or Esc reveals a way back for a few seconds.
  const [showExit, setShowExit] = useState(false);

  useEffect(() => {
    let timer = 0;
    const reveal = () => {
      setShowExit(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowExit(false), 4000);
    };
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" ? goBack("scoring") : reveal());
    window.addEventListener("pointermove", reveal);
    window.addEventListener("pointerdown", reveal);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", reveal);
      window.removeEventListener("pointerdown", reveal);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setSlide((slide + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [slide, setSlide]);

  const round = activeRound(state);
  const item = currentScheduleItem(state, now);
  const clock = new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const kind = SLIDES[slide % SLIDES.length] ?? "live";
  const title =
    kind === "live"
      ? `${t.display.liveScores} · ${t.round(round)}`
      : kind === "overall"
        ? t.standings.overallTitle
        : t.display.groups;

  return (
    <div className={`flex h-screen flex-col gap-[1.5vh] overflow-hidden p-[2vw] ${showExit ? "" : "cursor-none"}`}>
      {showExit && (
        <button
          className="fixed bottom-3 left-3 z-50 rounded-full bg-navy/80 px-3 py-1.5 font-cond text-sm font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/30 backdrop-blur hover:bg-surface hover:text-brand"
          onClick={() => goBack("scoring")}
        >
          ← {t.display.exit}
        </button>
      )}
      <header className="flex items-end gap-[2vw]">
        <div className="leading-none">
          <div className="headline text-[4.2vw] leading-none">{state.settings.title}</div>
          <div className="subline text-[1.7vw]">
            {state.settings.subtitle} · {state.settings.date}
          </div>
        </div>
        <div className="ml-auto text-right leading-none">
          <div className="score text-[4.2vw]">{clock}</div>
          {item && <div className="subline text-[1.6vw]">{item.label}</div>}
        </div>
      </header>

      <div className="flex items-center gap-[1vw]">
        <span className="rounded-full bg-red-600 px-[1vw] py-[0.3vh] font-cond text-[1.5vw] font-bold uppercase">
          ● {t.display.live}
        </span>
        <h2 className="headline text-[3vw]">{title}</h2>
        <div className="ml-auto flex gap-[0.6vw]">
          {SLIDES.map((s, i) => (
            <span key={s} className={`h-[1vw] w-[3vw] rounded-full ${i === slide ? "bg-brand" : "bg-white/20"}`} />
          ))}
        </div>
      </div>

      <main className="min-h-0 flex-1">
        {kind === "live" && (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-[1.5vw]">
            {duelsOfRound(state, round).map((d) => (
              <CourtCard key={d.id} state={state} duel={d} now={now} big />
            ))}
          </div>
        )}
        {kind === "overall" && (
          <div className="card h-full px-[2vw] py-[1vh] ring-4 ring-brand">
            <StandingsTable state={state} rows={overallStandings(state)} context="overall" big highlightLeader />
          </div>
        )}
        {kind === "groups" && (
          <div className="grid h-full grid-cols-2 gap-[1.5vw]">
            {GROUPS.map((g) => (
              <div key={g} className="card px-[1.5vw] py-[1vh]">
                <div className="headline text-[3vw]">{t.standings.groupTitle(g)}</div>
                <StandingsTable
                  state={state}
                  rows={groupStandings(state, g)}
                  context={g === "A" ? "groupA" : "groupB"}
                  big
                  columns="points"
                />
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="subline text-center text-[1.5vw]">{t.motto}</footer>
    </div>
  );
}
