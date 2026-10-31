import { useEffect } from "react";
import { t } from "../i18n/texts";
import { useNow } from "../store/hooks";
import { roundClock, useRoundClock } from "../store/roundClock";
import { timerInfo } from "./MatchTimer";
import { Icon, Segmented } from "./ui";

const LENGTHS = [15, 20];
const digits = { idle: "text-ink", running: "text-ink", warning: "text-warn", over: "text-bad" } as const;
const bar = { idle: "bg-tint", running: "bg-tint", warning: "bg-warn", over: "bg-bad" } as const;

/** Keeps the clock's length in line with the round on screen (15 min, round 3: 20 min). */
export function useRoundClockFor(round: number, defaultMinutes: number) {
  const clock = useRoundClock();
  const fresh = clock.startedAt == null && clock.elapsedMs === 0;
  useEffect(() => {
    if (fresh) roundClock.prepare(round, defaultMinutes);
  }, [round, defaultMinutes, fresh]);
  return clock;
}

/** Countdown for the round on all courts – only warns, never blocks scoring. */
export default function RoundClock({ round, defaultMinutes }: { round: number; defaultMinutes: number }) {
  const clock = useRoundClockFor(round, defaultMinutes);
  const now = useNow(250);
  const info = timerInfo(clock, clock.minutes, now);
  const blink = info.running && info.phase !== "running";
  const touched = info.running || clock.elapsedMs > 0;
  const lengths = LENGTHS.includes(clock.minutes) ? LENGTHS : [...LENGTHS, clock.minutes].sort((a, b) => a - b);

  return (
    <div className="card flex w-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{t.timer.roundClock}</span>
        {info.phase === "warning" && <span className="chip bg-warn/15 !py-0.5 text-[12px] text-warn">{t.timer.twoMinutes}</span>}
        {info.phase === "over" && <span className="chip bg-bad/15 !py-0.5 text-[12px] text-bad">{t.timer.overtime}</span>}
      </div>
      <Segmented<number>
        label={t.timer.length}
        className="w-full"
        value={clock.minutes}
        onChange={(m) => roundClock.setMinutes(m)}
        options={lengths.map((m) => ({ value: m, label: t.timer.minutes(m) }))}
      />
      <div className="flex items-center gap-3">
        <div className={`num min-w-0 flex-1 text-[48px] leading-none ${digits[info.phase]} ${blink ? "blink" : ""}`} aria-live="off">
          {info.label}
        </div>
        <button
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-fill/[0.14] text-ink transition active:scale-95 disabled:opacity-40"
          onClick={() => roundClock.reset()}
          disabled={!touched}
          aria-label={t.timer.reset}
          title={t.timer.reset}
        >
          <Icon name="rotate" className="h-5 w-5" />
        </button>
        {info.running ? (
          <button
            className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-full bg-warn/15 px-4 text-[17px] font-semibold text-warn transition active:scale-95"
            onClick={() => roundClock.pause()}
          >
            <Icon name="pause" className="h-5 w-5" />
            {t.timer.pause}
          </button>
        ) : (
          <button
            className="flex h-[52px] shrink-0 items-center gap-1.5 rounded-full bg-yellow px-4 text-[17px] font-semibold text-navy transition active:scale-95"
            onClick={() => roundClock.start()}
          >
            <Icon name="play" className="h-5 w-5" />
            {t.timer.start}
          </button>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fill/[0.14]">
        <div
          className={`h-full origin-left rounded-full transition-[transform,background-color] duration-300 ${bar[info.phase]}`}
          style={{ transform: `scaleX(${info.progress})` }}
        />
      </div>
    </div>
  );
}

/** Small read-out for the sticky duel bar, so the time stays in view while entering points. */
export function RoundClockBadge({ round, defaultMinutes }: { round: number; defaultMinutes: number }) {
  const clock = useRoundClockFor(round, defaultMinutes);
  const now = useNow(250);
  const info = timerInfo(clock, clock.minutes, now);
  const color = info.phase === "over" ? "text-[#ff8a80]" : info.phase === "warning" ? "text-[#E28154]" : "text-yellow";
  return (
    <button
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 transition active:scale-95"
      onClick={() => (info.running ? roundClock.pause() : roundClock.start())}
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
