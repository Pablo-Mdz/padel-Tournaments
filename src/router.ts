import { useSyncExternalStore } from "react";

export type Route = "scoring" | "standings" | "setup" | "results" | "display";

export const ROUTE_PATHS: Record<Route, string> = {
  scoring: "/",
  standings: "/standings",
  setup: "/setup",
  results: "/results",
  display: "/display",
};

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Single-file builds keep the URL untouched and only use the history state. */
const hashMode = import.meta.env.VITE_HASH_ROUTER === "1";

/** What the browser history remembers for each step: the screen and, on Scoring, the open court. */
export interface HistoryState {
  route: Route;
  court?: number | null;
}

function routeFromLocation(): Route {
  // Accept /display, #/display and #display so it works on hosts without SPA fallback.
  const { hash, pathname } = window.location;
  const path = hash.length > 1 ? "/" + hash.replace(/^#\/?/, "") : hashMode ? "/" : pathname.slice(base.length);
  const clean = path.replace(/\/+$/, "") || "/";
  return (Object.keys(ROUTE_PATHS) as Route[]).find((r) => ROUTE_PATHS[r] === clean) ?? "scoring";
}

function readState(): HistoryState | null {
  const s = window.history.state as HistoryState | null;
  return s && typeof s === "object" && "route" in s ? s : null;
}

let current: Route = readState()?.route ?? routeFromLocation();
const listeners = new Set<() => void>();

function set(route: Route) {
  current = route;
  listeners.forEach((l) => l());
}

/** Pushes a history entry so the browser/tablet back button steps back inside the app. */
export function pushHistory(state: HistoryState, replace = false): boolean {
  const url = hashMode ? undefined : base + ROUTE_PATHS[state.route];
  try {
    if (replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
    return true;
  } catch {
    // History can be unavailable in sandboxed frames; in-app navigation still works.
    return false;
  }
}

/** Court open on the Scoring screen according to the current history entry. */
export function historyCourt(): number | null {
  const c = readState()?.court;
  return typeof c === "number" ? c : null;
}

export function navigate(route: Route) {
  if (route === current && readState()?.court == null) return;
  pushHistory({ route });
  set(route);
  // Lets screens that keep extra state in the history entry (the open court) reset it.
  window.dispatchEvent(new Event("app:navigate"));
}

/** Goes back one step if the app put it there, otherwise to `fallback`. */
export function goBack(fallback: Route = "scoring") {
  if (readState()) window.history.back();
  else navigate(fallback);
}

export function hrefFor(route: Route): string {
  if (hashMode) return route === "scoring" ? "#" : `#${route}`;
  return base + ROUTE_PATHS[route];
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => set(readState()?.route ?? routeFromLocation()));
  window.addEventListener("hashchange", () => set(routeFromLocation()));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current);
}
