import { t } from "../i18n/texts";
import { timerElapsedMs } from "../model/tournament";
import { Timer } from "../model/types";
import { useNow } from "../store/hooks";

export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${ms < 0 ? "+" : ""}${m}:${String(s).padStart(2, "0")}`;
}

export type TimerPhase = "idle" | "running" | "warning" | "over";

export function timerInfo(timer: Timer, minutes: number, now: number) {
  const remaining = minutes * 60_000 - timerElapsedMs(timer, now);
  const running = timer.startedAt != null;
  let phase: TimerPhase = running ? "running" : "idle";
  if (remaining <= 0) phase = "over";
  else if (remaining <= 2 * 60_000 && (running || timer.elapsedMs > 0)) phase = "warning";
  // Past zero we show the overtime counting up ("+0:35").
  return { remaining, running, phase, label: formatClock(remaining <= 0 ? remaining : remaining + 999) };
}

export const phaseColor: Record<TimerPhase, string> = {
  idle: "text-white",
  running: "text-white",
  warning: "text-brand",
  over: "text-red-400",
};

interface Props {
  timer: Timer;
  minutes: number;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

/** Countdown for one match. It never blocks scoring – it only warns. */
export default function MatchTimer({ timer, minutes, onStart, onPause, onReset }: Props) {
  const now = useNow(250);
  const info = timerInfo(timer, minutes, now);
  const blink = info.running && info.phase !== "running";
  return (
    <div
      className={`card flex flex-col items-center gap-2 p-3 ${
        info.phase === "over" ? "bg-red-900/60 ring-red-400" : info.phase === "warning" ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className={`score text-5xl sm:text-6xl ${phaseColor[info.phase]} ${blink ? "blink" : ""}`}>{info.label}</div>
      {info.phase === "warning" && <div className="subline text-sm text-brand">{t.timer.twoMinutes}</div>}
      {info.phase === "over" && <div className="subline text-sm text-red-300">{t.timer.overtime}</div>}
      {onStart && (
        <div className="flex w-full gap-2">
          {info.running ? (
            <button className="btn-accent flex-1" onClick={onPause}>
              ❚❚ {t.timer.pause}
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={onStart}>
              ▶ {t.timer.start}
            </button>
          )}
          <button className="btn-secondary" onClick={onReset} aria-label={t.timer.reset}>
            ↺ {t.timer.reset}
          </button>
        </div>
      )}
    </div>
  );
}
