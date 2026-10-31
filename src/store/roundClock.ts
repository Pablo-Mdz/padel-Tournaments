import { useSyncExternalStore } from "react";

// Countdown for the whole round (all courts start together). It lives only on this
// device: starting or pausing it never republishes the page, and it keeps running
// across the reload that follows every publish.

export interface RoundClock {
  startedAt: number | null;
  elapsedMs: number;
  minutes: number;
  /** Round the clock was last set up for – a new round picks its own default length. */
  round: number;
}

const KEY = "pts:roundClock";
const listeners = new Set<() => void>();

function load(): RoundClock {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Partial<RoundClock>;
      return {
        startedAt: typeof c.startedAt === "number" ? c.startedAt : null,
        elapsedMs: typeof c.elapsedMs === "number" && c.elapsedMs > 0 ? c.elapsedMs : 0,
        minutes: typeof c.minutes === "number" && c.minutes > 0 ? c.minutes : 15,
        round: typeof c.round === "number" ? c.round : 0,
      };
    }
  } catch {
    /* ignore */
  }
  return { startedAt: null, elapsedMs: 0, minutes: 15, round: 0 };
}

let clock = load();

function set(next: RoundClock) {
  clock = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(clock));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      clock = load();
      listeners.forEach((l) => l());
    }
  });
}

const isFresh = (c: RoundClock) => c.startedAt == null && c.elapsedMs === 0;

export const roundClock = {
  start() {
    if (clock.startedAt == null) set({ ...clock, startedAt: Date.now() });
  },
  pause() {
    if (clock.startedAt == null) return;
    set({ ...clock, startedAt: null, elapsedMs: clock.elapsedMs + Math.max(0, Date.now() - clock.startedAt) });
  },
  reset() {
    set({ ...clock, startedAt: null, elapsedMs: 0 });
  },
  setMinutes(minutes: number) {
    set({ ...clock, minutes });
  },
  /** Switching to another round: an unused clock takes that round's default length. */
  prepare(round: number, defaultMinutes: number) {
    if (clock.round === round) return;
    if (isFresh(clock)) set({ ...clock, round, minutes: defaultMinutes });
  },
};

export function useRoundClock(): RoundClock {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => clock,
  );
}
