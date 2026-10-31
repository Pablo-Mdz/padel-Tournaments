import { timerElapsedMs } from "../model/tournament";

/** A running clock: `startedAt` is null while paused, `elapsedMs` is the time before that. */
export interface ClockState {
  startedAt: number | null;
  elapsedMs: number;
}

export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${ms < 0 ? "+" : ""}${m}:${String(s).padStart(2, "0")}`;
}

export type TimerPhase = "idle" | "running" | "warning" | "over";

export function timerInfo(timer: ClockState, minutes: number, now: number) {
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
