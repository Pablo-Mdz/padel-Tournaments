import { useEffect, useState } from "react";

export type Route = "scoring" | "standings" | "setup" | "results" | "display";

export const ROUTE_PATHS: Record<Route, string> = {
  scoring: "/",
  standings: "/standings",
  setup: "/setup",
  results: "/results",
  display: "/display",
};

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Hash routing (#display) for hosts that cannot serve deep links, e.g. a single-file build. */
const hashMode = import.meta.env.VITE_HASH_ROUTER === "1";

function currentRoute(): Route {
  // Accept /display, #/display and #display so it works on hosts without SPA fallback.
  const { hash, pathname } = window.location;
  const path = hash.length > 1 ? "/" + hash.replace(/^#\/?/, "") : hashMode ? "/" : pathname.slice(base.length);
  const clean = path.replace(/\/+$/, "") || "/";
  return (Object.keys(ROUTE_PATHS) as Route[]).find((r) => ROUTE_PATHS[r] === clean) ?? "scoring";
}

export function navigate(route: Route) {
  if (hashMode) {
    window.location.hash = route === "scoring" ? "" : route;
    return;
  }
  window.history.pushState(null, "", base + ROUTE_PATHS[route]);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function hrefFor(route: Route): string {
  if (hashMode) return route === "scoring" ? "#" : `#${route}`;
  return base + ROUTE_PATHS[route];
}

export function useRoute(): Route {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const on = () => setRoute(currentRoute());
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  return route;
}
