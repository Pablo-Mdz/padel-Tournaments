import { CSSProperties } from "react";
import { t } from "../i18n/texts";
import { courtLabelNumber, currentMatchIndex, duelTotals, leader, teamById } from "../model/tournament";
import { Duel, TournamentState } from "../model/types";
import { timerInfo } from "./MatchTimer";
import { Icon, Num } from "./ui";

interface Props {
  state: TournamentState;
  duel: Duel;
  now: number;
  onOpen?: () => void;
  /** TV screen: sized to the viewport, dark glass. */
  big?: boolean;
  style?: CSSProperties;
}

/** Scoreboard for one court: both teams, the duel total, the running match and its clock. */
export default function CourtCard({ state, duel, now, onOpen, big, style }: Props) {
  const total = duelTotals(duel);
  const lead = leader(total);
  const a = teamById(state, duel.teamA);
  const b = teamById(state, duel.teamB);
  const idx = currentMatchIndex(duel);
  const match = idx >= 0 && !duel.closed ? duel.matches[idx] : null;
  const minutes = state.settings.matchMinutes[duel.round - 1];
  const clock = match ? timerInfo(match.timer, minutes, now) : null;
  const started = duel.closed || duel.matches.some((m) => m.closed || m.score.a + m.score.b > 0);

  const status = duel.closed ? (
    <span className={`chip bg-fill/[0.14] text-ink2 ${big ? "!text-[2.2vh]" : ""}`}>
      <Icon name="check" className={big ? "h-[2.2vh] w-[2.2vh]" : "h-3.5 w-3.5"} />
      {t.display.finished}
    </span>
  ) : match ? (
    <span className={`chip bg-yellow text-navy ${big ? "!text-[2.2vh]" : ""}`}>
      {started && <span className="live-dot bg-navy text-navy/40" />}
      {t.matchTypes[match.type]}
      {clock && (clock.running || match.timer.elapsedMs > 0) && (
        <span className={`num ${clock.phase === "over" ? "text-bad" : "text-navy"} ${clock.running && clock.phase !== "running" ? "blink" : ""}`}>
          {clock.label}
        </span>
      )}
    </span>
  ) : null;

  const row = (name: string | undefined, score: number, isLead: boolean, trailing: boolean) => (
    <div className="relative flex items-center gap-3">
      <span
        aria-hidden
        className={`absolute -left-3 h-[70%] w-[4px] rounded-full transition-colors ${isLead ? "bg-yellow" : "bg-transparent"} ${
          big ? "-left-[1.4vw] w-[0.4vw]" : ""
        }`}
      />
      <span
        className={`min-w-0 flex-1 truncate font-semibold ${big ? "text-[3.3vh]" : "text-[19px]"} ${
          trailing ? "text-ink2" : "text-ink"
        }`}
      >
        {name ?? t.tbd}
      </span>
      <Num
        value={score}
        className={`leading-none ${big ? "text-[6.8vh]" : "text-[40px]"} ${trailing ? "text-ink2" : "text-ink"}`}
      />
    </div>
  );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`eyebrow ${big ? "!text-[2.4vh] text-yellow" : "text-tint"}`}>
          {t.court(courtLabelNumber(state, duel.courtIndex))}
          {duel.walkover && <span className="ml-2 text-warn">{t.scoring.walkover}</span>}
        </span>
        {status}
      </div>

      <div className={`flex flex-col ${big ? "gap-[0.2vh]" : "gap-1 py-1"}`}>
        {row(a?.name, total.a, lead === "a", lead === "b")}
        {row(b?.name, total.b, lead === "b", lead === "a")}
      </div>

      {/* The four matches at a glance */}
      <div className={`grid grid-cols-4 border-t hairline ${big ? "gap-[0.6vw] pt-[0.9vh]" : "gap-1.5 pt-2.5"}`}>
        {duel.matches.map((m, i) => {
          const current = i === idx && !duel.closed;
          return (
            <div
              key={m.type}
              className={`rounded-xl text-center transition-colors ${big ? "py-[0.4vh]" : "py-1"} ${
                current ? "bg-yellow text-navy" : m.closed ? "text-ink" : "text-ink opacity-55"
              }`}
            >
              <div className={`truncate font-medium ${current ? "text-navy/70" : "text-ink2"} ${big ? "text-[1.7vh]" : "text-[11px]"}`}>
                {t.matchTypes[m.type]}
              </div>
              <div className={`num ${big ? "text-[2.5vh]" : "text-[15px]"}`}>
                {m.closed || m.score.a + m.score.b > 0 ? `${m.score.a}:${m.score.b}` : "–"}
              </div>
            </div>
          );
        })}
      </div>

      {onOpen && (
        <div className="-mb-1 flex items-center justify-end gap-1 pt-1 text-[15px] font-semibold text-tint">
          {t.scoring.enterPoints}
          <Icon name="chevronRight" className="h-4 w-4" />
        </div>
      )}
    </>
  );

  const cls = big
    ? "flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-[2.4vh] bg-white/[0.07] px-[2vw] py-[1.5vh] ring-1 ring-white/10 backdrop-blur"
    : "card flex w-full flex-col gap-2 p-4 pl-5 text-left";

  if (onOpen) {
    return (
      <button
        onClick={onOpen}
        style={style}
        className={`${cls} anim-rise transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgb(1_19_91/0.45)] active:scale-[0.985]`}
      >
        {body}
      </button>
    );
  }
  return (
    <div style={style} className={`${cls} anim-rise`}>
      {body}
    </div>
  );
}
