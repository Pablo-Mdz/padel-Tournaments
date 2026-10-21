import { t } from "../i18n/texts";
import { timerElapsedMs } from "../model/tournament";
import { Timer } from "../model/types";
import { useNow } from "../store/hooks";
import { Icon } from "./ui";

export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${ms < 0 ? "+" : ""}${m}:${String(s).padStart(2, "0")}`;
}

export type TimerPhase = "idle" | "running" | "warning" | "over";

export function timerInfo(timer: Timer, minutes: number, now: number) {
  const total = minutes * 60_000;
  const elapsed = timerElapsedMs(timer, now);
  const remaining = total - elapsed;
  const running = timer.startedAt != null;
  let phase: TimerPhase = running ? "running" : "idle";
  if (remaining <= 0) phase = "over";
  else if (remaining <= 2 * 60_000 && (running || timer.elapsedMs > 0)) phase = "warning";
  return {
    remaining,
    running,
    phase,
    progress: Math.min(1, elapsed / total),
    // Past zero the overtime counts up ("+0:35").
    label: formatClock(remaining <= 0 ? remaining : remaining + 999),
  };
}

const digits = { idle: "text-ink", running: "text-ink", warning: "text-warn", over: "text-bad" } as const;
const bar = { idle: "bg-tint", running: "bg-tint", warning: "bg-warn", over: "bg-bad" } as const;

interface Props {
  timer: Timer;
  minutes: number;
  title?: string;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

/** Countdown for one match, styled after the iOS Clock timer. It never blocks scoring – it only warns. */
export default function MatchTimer({ timer, minutes, title, onStart, onPause, onReset }: Props) {
  const now = useNow(250);
  const info = timerInfo(timer, minutes, now);
  const blink = info.running && info.phase !== "running";
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{title ?? `${minutes} min`}</span>
        {info.phase === "warning" && <span className="chip bg-warn/15 text-warn">{t.timer.twoMinutes}</span>}
        {info.phase === "over" && <span className="chip bg-bad/15 text-bad">{t.timer.overtime}</span>}
      </div>
      <div className={`num text-center text-[56px] leading-none ${digits[info.phase]} ${blink ? "blink" : ""}`}>
        {info.label}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fill/[0.14]">
        <div
          className={`h-full origin-left rounded-full transition-[transform,background-color] duration-300 ${bar[info.phase]}`}
          style={{ transform: `scaleX(${info.progress})` }}
        />
      </div>
      {onStart && (
        <div className="flex items-center justify-between pt-1">
          <button
            className="grid h-[60px] w-[60px] place-items-center rounded-full bg-fill/[0.14] text-ink transition active:scale-95"
            onClick={onReset}
            aria-label={t.timer.reset}
            title={t.timer.reset}
          >
            <Icon name="rotate" className="h-6 w-6" />
          </button>
          {info.running ? (
            <button
              className="flex h-[60px] items-center gap-2 rounded-full bg-warn/15 px-6 text-[17px] font-semibold text-warn transition active:scale-95"
              onClick={onPause}
            >
              <Icon name="pause" className="h-5 w-5" />
              {t.timer.pause}
            </button>
          ) : (
            <button
              className="flex h-[60px] items-center gap-2 rounded-full bg-yellow px-6 text-[17px] font-semibold text-navy transition active:scale-95"
              onClick={onStart}
            >
              <Icon name="play" className="h-5 w-5" />
              {t.timer.start}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
