import { useEffect, useState } from "react";
import CourtCard from "../components/CourtCard";
import Logo from "../components/Logo";
import QrCode, { appUrl } from "../components/QrCode";
import { RoundClockTV } from "../components/RoundClock";
import StandingsTable from "../components/StandingsTable";
import { Icon, stagger } from "../components/ui";
import { t } from "../i18n/texts";
import { overallStandings, qualifyingStandings } from "../model/standings";
import { activeRound, duelsOfRound } from "../model/tournament";
import { TournamentState } from "../model/types";
import { goBack } from "../router";
import { useNow, useSessionState } from "../store/hooks";
import { useTournament } from "../store/store";

const SLIDE_MS = 15_000;
const SLIDES = ["live", "overall", "qualifying"] as const;

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
  const courts = duelsOfRound(state, round).length;
  // 2 courts sit side by side; 3 or more wrap into two rows.
  const cols = courts <= 2 ? courts : Math.ceil(courts / 2);
  const rows = courts <= 2 ? 1 : 2;
  const item = currentScheduleItem(state, now);
  const clock = new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const kind = SLIDES[slide % SLIDES.length] ?? "live";
  const title =
    kind === "live"
      ? `${t.display.liveScores} · ${t.round(round)}`
      : kind === "overall"
        ? t.standings.overallTitle
        : t.display.qualifying;

  return (
    <div
      className={`theme-tv relative flex h-screen flex-col gap-[2vh] overflow-hidden bg-navy px-[2.4vw] py-[3vh] text-ink ${
        showExit ? "" : "cursor-none"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(80% 60% at 85% -10%, rgb(16 46 118 / 0.95), transparent 60%), radial-gradient(60% 50% at -10% 110%, rgb(16 46 118 / 0.8), transparent 60%)",
      }}
    >
      {showExit && (
        <button
          className="fixed bottom-3 left-3 z-50 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur hover:bg-white/20"
          onClick={() => goBack("scoring")}
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
          {t.display.exit}
        </button>
      )}

      <header className="flex items-center gap-[1.4vw]">
        <Logo
          logo={state.settings.logo}
          className="h-[7vh] w-[7vh] shrink-0 rounded-[1.8vh]"
          iconClassName="h-[4.4vh] w-[4.4vh]"
        />
        <div className="leading-tight">
          <div className="text-[5vh] font-bold tracking-[-0.02em]">{state.settings.title}</div>
          <div className="text-[2.2vh] font-medium text-ink2">
            {state.settings.subtitle} · {state.settings.date}
          </div>
        </div>
        <div className="ml-auto">
          <RoundClockTV state={state} />
        </div>
        <div className="text-right leading-tight">
          <div className="num text-[6vh]">{clock}</div>
          {item && <div className="text-[2.2vh] font-semibold text-yellow">{item.label}</div>}
        </div>
      </header>

      <div className="flex items-center gap-[1vw]">
        <span className="inline-flex items-center gap-[0.6vw] rounded-full bg-white/10 px-[1vw] py-[0.6vh] text-[2vh] font-bold uppercase tracking-[0.08em]">
          <span className="live-dot h-[1.2vh] w-[1.2vh] bg-yellow text-yellow/60" />
          {t.display.live}
        </span>
        <h2 key={kind} className="anim-rise text-[3.8vh] font-bold tracking-[-0.01em]">
          {title}
        </h2>
        {/* Slide indicator: the current segment fills up until the next slide. */}
        <div className="ml-auto flex gap-[0.5vw]">
          {SLIDES.map((s, i) => (
            <span key={s} className="h-[0.8vh] w-[4vw] overflow-hidden rounded-full bg-white/15">
              {i < slide % SLIDES.length && <span className="block h-full w-full bg-white/60" />}
              {i === slide % SLIDES.length && (
                <span
                  key={slide}
                  className="block h-full w-full origin-left bg-yellow"
                  style={{ animation: `fill-x ${SLIDE_MS}ms linear both` }}
                />
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-[1.6vw]">
      <main key={kind} className="anim-rise min-h-0 min-w-0 flex-1">
        {kind === "live" && (
          <div
            className="grid h-full gap-[1.6vw]"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {duelsOfRound(state, round).map((d, i) => (
              <CourtCard key={d.id} state={state} duel={d} big style={stagger(i, 90)} />
            ))}
          </div>
        )}
        {kind === "overall" && (
          <div className="relative h-full overflow-hidden rounded-[2.4vh] bg-white/[0.07] px-[2vw] py-[1.5vh] ring-1 ring-white/10 backdrop-blur">
            <span aria-hidden className="absolute inset-x-0 top-0 h-[0.6vh] bg-yellow" />
            <StandingsTable state={state} rows={overallStandings(state)} context="overall" big highlightLeader />
          </div>
        )}
        {kind === "qualifying" && (
          <div className="relative h-full overflow-hidden rounded-[2.4vh] bg-white/[0.07] px-[2vw] py-[1.5vh] ring-1 ring-white/10 backdrop-blur">
            <StandingsTable
              state={state}
              rows={qualifyingStandings(state)}
              context="qualifying"
              big
              columns="points"
            />
          </div>
        )}
      </main>
      <LiveQr />
      </div>
      <footer className="text-center text-[2vh] font-semibold uppercase tracking-[0.14em] text-ink2">{t.motto}</footer>
    </div>
  );
}

/**
 * QR code to this very page, so players can follow the results on their own phones.
 * It is built from the address the app is served from, so it keeps working on any host.
 */
function LiveQr() {
  const url = appUrl();
  if (!url) return null;
  return (
    <aside className="flex w-[27vh] shrink-0 flex-col justify-end">
      <div className="flex flex-col items-center gap-[1vh] rounded-[2.4vh] bg-white p-[1.4vh] text-navy shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)]">
        <QrCode text={url} className="block aspect-square w-full" />
        <div className="text-center leading-tight">
          <div className="whitespace-nowrap text-[2.2vh] font-bold">{t.display.scanTitle}</div>
          <div className="text-[1.5vh] font-medium text-navy/70">{t.display.scanHint}</div>
        </div>
      </div>
    </aside>
  );
}
