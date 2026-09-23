import { t } from "../i18n/texts";
import { courtLabelNumber, currentMatchIndex, duelTotals, leader, teamById } from "../model/tournament";
import { Duel, TournamentState } from "../model/types";
import { phaseColor, timerInfo } from "./MatchTimer";

interface Props {
  state: TournamentState;
  duel: Duel;
  now: number;
  onOpen?: () => void;
  /** TV screen size. */
  big?: boolean;
}

/** Summary of one court: teams, duel score, running match and clock. */
export default function CourtCard({ state, duel, now, onOpen, big }: Props) {
  const total = duelTotals(duel);
  const lead = leader(total);
  const a = teamById(state, duel.teamA);
  const b = teamById(state, duel.teamB);
  const idx = currentMatchIndex(duel);
  const match = idx >= 0 ? duel.matches[idx] : null;
  const minutes = state.settings.matchMinutes[duel.round - 1];
  const clock = match ? timerInfo(match.timer, minutes, now) : null;

  const nameCls = big ? "text-[3.6vh]" : "text-xl sm:text-2xl";
  const scoreCls = big ? "text-[9vh]" : "text-6xl sm:text-7xl";

  const side = (name: string | undefined, score: number, isLead: boolean) => (
    <div className={`flex min-w-0 flex-1 flex-col items-center rounded-xl px-2 py-1 ${isLead ? "bg-brand/10 ring-2 ring-brand/60" : ""}`}>
      <div
        className={`w-full truncate text-center font-cond font-bold uppercase ${nameCls} ${
          isLead ? "text-brand" : "text-white"
        }`}
      >
        {name ?? t.tbd}
      </div>
      <div className={`score ${scoreCls} ${isLead ? "text-brand" : "text-white"}`}>{score}</div>
    </div>
  );

  const Wrapper = onOpen ? "button" : "div";
  return (
    <Wrapper
      onClick={onOpen}
      className={`card flex w-full flex-col text-left transition ${onOpen ? "hover:ring-brand active:scale-[0.99]" : ""} ${
        big ? "h-full min-h-0 justify-between gap-[0.8vh] overflow-hidden px-[1.5vw] py-[1.2vh]" : "gap-2 p-3"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`headline ${big ? "text-[4.8vh]" : "text-3xl"}`}>
          {t.court(courtLabelNumber(state, duel.courtIndex))}
        </span>
        <span className={`subline ${big ? "text-[3vh]" : "text-sm"}`}>
          {duel.closed
            ? t.display.finished
            : match
              ? `${t.display.currentMatch}: ${t.matchTypes[match.type]}`
              : t.display.finished}
          {duel.walkover && ` · ${t.scoring.walkover}`}
        </span>
      </div>
      <div className="flex items-stretch gap-1">
        {side(a?.name, total.a, lead === "a")}
        <div className={`self-center font-cond font-bold text-white/50 ${big ? "text-[5vh]" : "text-xl"}`}>:</div>
        {side(b?.name, total.b, lead === "b")}
      </div>
      {match && !duel.closed && (
        <div
          className={`flex items-center justify-between rounded-xl bg-navy/60 px-3 py-1 ${
            big ? "text-[3.6vh]" : "text-lg"
          }`}
        >
          <span className="font-cond font-bold uppercase text-accent">{t.matchTypes[match.type]}</span>
          <span className="score">
            {match.score.a} : {match.score.b}
          </span>
          {clock && (
            <span className={`score ${phaseColor[clock.phase]} ${clock.running && clock.phase !== "running" ? "blink" : ""}`}>
              {clock.label}
            </span>
          )}
        </div>
      )}
    </Wrapper>
  );
}
