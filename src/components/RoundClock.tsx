import { useEffect } from "react";
import { t } from "../i18n/texts";
import { roundClockMinutes, roundClockTouched } from "../model/tournament";
import { RoundNo, TournamentState } from "../model/types";
import { useNow } from "../store/hooks";
import { takeLegacyClock } from "../store/roundClock";
import { dispatch } from "../store/store";
import { timerInfo } from "./clock";
import { Icon, Segmented } from "./ui";

const LENGTHS = [15, 20];
const digits = { idle: "text-ink", running: "text-ink", warning: "text-warn", over: "text-bad" } as const;
const bar = { idle: "bg-tint", running: "bg-tint", warning: "bg-warn", over: "bg-bad" } as const;

export function useRoundClockInfo(state: TournamentState, viewedRound?: RoundNo) {
  const now = useNow(250);
  const clock = state.roundClock;
  const minutes = roundClockMinutes(state, viewedRound);
  return { clock, minutes, touched: roundClockTouched(clock), ...timerInfo(clock, minutes, now) };
}

function toggle(state: TournamentState, running: boolean, round: RoundNo, minutes: number) {
  if (running) dispatch({ type: "clockPause" });
  else dispatch({ type: "clockStart", round: roundClockTouched(state.roundClock) ? state.roundClock.round : round, minutes });
}

/**
 * Countdown for the round on all courts. The organiser controls it; everybody else
 * (players' phones, the TV) only sees the time. It only warns, never blocks scoring.
 */
export default function RoundClock({ state, round, readOnly }: { state: TournamentState; round: RoundNo; readOnly: boolean }) {
  const info = useRoundClockInfo(state, round);
  const { clock, minutes, touched } = info;
  const blink = info.running && info.phase !== "running";
  const otherRound = touched && clock.round !== round;

  // One-time take-over of a clock that was started before it became shared.
  useEffect(() => {
    if (readOnly || touched) return;
    const legacy = takeLegacyClock();
    if (legacy) dispatch({ type: "clockRestore", clock: legacy });
  }, [readOnly, touched]);

  if (readOnly && !touched) return null;

  const lengths = LENGTHS.includes(minutes) ? LENGTHS : [...LENGTHS, minutes].sort((a, b) => a - b);

  return (
    <div className="card flex w-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">
          {readOnly ? `${t.round(clock.round)} · ${t.timer.timeLeft}` : t.timer.roundClock}
          {!readOnly && otherRound ? ` · ${t.round(clock.round)}` : ""}
        </span>
        {info.phase === "warning" && <span className="chip bg-warn/15 !py-0.5 text-[12px] text-warn">{t.timer.twoMinutes}</span>}
        {info.phase === "over" && <span className="chip bg-bad/15 !py-0.5 text-[12px] text-bad">{t.timer.overtime}</span>}
        {readOnly && !info.running && info.phase !== "over" && (
          <span className="chip bg-fill/[0.14] !py-0.5 text-[12px] text-ink2">{t.timer.paused}</span>
        )}
      </div>
      {!readOnly && (
        <Segmented<number>
          label={t.timer.length}
          className="w-full"
          value={minutes}
          onChange={(m) => dispatch({ type: "clockSetMinutes", minutes: m })}
          options={lengths.map((m) => ({ value: m, label: t.timer.minutes(m) }))}
        />
      )}
      <div className="flex items-center gap-3">
        <div className={`num min-w-0 flex-1 text-[48px] leading-none ${digits[info.phase]} ${blink ? "blink" : ""}`}>
          {info.label}
        </div>
        {!readOnly && (
          <>
            <button
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-fill/[0.14] text-ink transition active:scale-95 disabled:opacity-40"
              onClick={() => dispatch({ type: "clockReset" })}
              disabled={!touched}
              aria-label={t.timer.reset}
              title={t.timer.reset}
            >
              <Icon name="rotate" className="h-5 w-5" />
            </button>
            {info.running ? (
              <button
                className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-full bg-warn/15 px-4 text-[17px] font-semibold text-warn transition active:scale-95"
                onClick={() => toggle(state, true, round, minutes)}
              >
                <Icon name="pause" className="h-5 w-5" />
                {t.timer.pause}
              </button>
            ) : (
              <button
                className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-full bg-yellow px-4 text-[17px] font-semibold text-navy transition active:scale-95"
                onClick={() => toggle(state, false, round, minutes)}
              >
                <Icon name="play" className="h-5 w-5" />
                {t.timer.start}
              </button>
            )}
          </>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fill/[0.14]">
        <div
          className={`h-full origin-left rounded-full transition-[transform,background-color] duration-300 ${bar[info.phase]}`}
          style={{ transform: `scaleX(${info.progress})` }}
        />
      </div>
      {!readOnly && <p className="-mt-1 text-[12px] text-ink2">{t.timer.sharedHint}</p>}
    </div>
  );
}

/** Small read-out for the sticky duel bar, so the time stays in view while entering points. */
export function RoundClockBadge({ state, round }: { state: TournamentState; round: RoundNo }) {
  const info = useRoundClockInfo(state, round);
  const color = info.phase === "over" ? "text-[#ff8a80]" : info.phase === "warning" ? "text-[#E28154]" : "text-yellow";
  return (
    <button
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 transition active:scale-95"
      onClick={() => toggle(state, info.running, round, info.minutes)}
      aria-label={`${t.timer.roundClock}: ${info.label} – ${info.running ? t.timer.pause : t.timer.start}`}
      title={info.running ? t.timer.pause : t.timer.start}
    >
      <Icon name={info.running ? "pause" : "play"} className="h-3.5 w-3.5 text-white/70" />
      <span className={`num text-[17px] leading-none ${color} ${info.running && info.phase !== "running" ? "blink" : ""}`}>
        {info.label}
      </span>
    </button>
  );
}

/** Big read-only countdown for the TV screen; hidden until the organiser starts the clock. */
export function RoundClockTV({ state }: { state: TournamentState }) {
  const info = useRoundClockInfo(state);
  if (!info.touched) return null;
  const color = info.phase === "over" ? "text-bad" : info.phase === "warning" ? "text-warn" : "text-yellow";
  const note = info.phase === "over" ? t.timer.overtime : info.phase === "warning" ? t.timer.twoMinutes : info.running ? null : t.timer.paused;
  return (
    <div className="flex items-center gap-[1.2vw] rounded-[2vh] bg-white/[0.08] px-[1.4vw] py-[0.8vh] ring-1 ring-white/15">
      <div className="text-right leading-tight">
        <div className="text-[1.9vh] font-bold uppercase tracking-[0.08em] text-ink2">
          {t.round(info.clock.round)} · {t.timer.timeLeft}
        </div>
        {note && <div className={`text-[1.9vh] font-semibold ${color}`}>{note}</div>}
      </div>
      <div className={`num text-[7vh] leading-none ${color} ${info.running && info.phase !== "running" ? "blink" : ""}`}>
        {info.label}
      </div>
    </div>
  );
}
