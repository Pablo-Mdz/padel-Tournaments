import { RoundClock } from "../model/types";

// The round clock used to live only on the organiser's device (key below). It is now
// part of the shared tournament state; a clock still running there is taken over once.

const LEGACY_KEY = "pts:roundClock";

export function takeLegacyClock(): RoundClock | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    localStorage.removeItem(LEGACY_KEY);
    const c = JSON.parse(raw) as Partial<RoundClock>;
    const startedAt = typeof c.startedAt === "number" ? c.startedAt : null;
    const elapsedMs = typeof c.elapsedMs === "number" && c.elapsedMs > 0 ? c.elapsedMs : 0;
    if (startedAt == null && elapsedMs === 0) return null;
    const round = c.round === 2 || c.round === 3 ? c.round : 1;
    return { startedAt, elapsedMs, minutes: typeof c.minutes === "number" ? c.minutes : null, round };
  } catch {
    return null;
  }
}
