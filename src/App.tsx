import { useEffect, useRef } from "react";
import { t } from "./i18n/texts";
import DisplayPage from "./pages/DisplayPage";
import ResultsPage from "./pages/ResultsPage";
import ScoringPage from "./pages/ScoringPage";
import SetupPage from "./pages/SetupPage";
import StandingsPage from "./pages/StandingsPage";
import { Route, hrefFor, navigate, useRoute } from "./router";
import { shareNow, storageOk, useReadOnly, useShareStatus, useTournament } from "./store/store";

const NAV: Array<{ route: Route; label: string }> = [
  { route: "scoring", label: t.nav.scoring },
  { route: "standings", label: t.nav.standings },
  { route: "results", label: t.nav.results },
  { route: "setup", label: t.nav.setup },
];

export default function App() {
  const route = useRoute();
  const state = useTournament();
  const headerRef = useRef<HTMLElement>(null);

  // Expose the header height so sticky elements below it (duel score) sit right under it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [route]);

  const readOnly = useReadOnly();
  const share = useShareStatus();

  if (route === "display") return <DisplayPage />;

  return (
    <div className="flex min-h-screen flex-col">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
          <div className="mr-auto leading-none">
            <div className="headline text-2xl sm:text-3xl">{state.settings.title}</div>
            <div className="subline text-xs sm:text-sm">
              {state.settings.subtitle} · {state.settings.date}
            </div>
          </div>
          <nav className="flex w-full gap-1 overflow-x-auto sm:w-auto">
            {NAV.filter((n) => !(readOnly && n.route === "setup")).map((n) => (
              <a
                key={n.route}
                href={hrefFor(n.route)}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(n.route);
                }}
                className={`btn flex-1 whitespace-nowrap px-2 text-base sm:flex-none sm:px-4 sm:text-lg ${
                  route === n.route ? "bg-brand text-navy" : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {n.label}
              </a>
            ))}
            <a
              href={hrefFor("display")}
              target={import.meta.env.VITE_HASH_ROUTER === "1" ? undefined : "_blank"}
              rel="noreferrer"
              className="btn hidden whitespace-nowrap bg-white/5 text-accent hover:bg-white/10 sm:inline-flex"
            >
              {t.nav.display} ↗
            </a>
          </nav>
        </div>
        {share !== "off" && <ShareBar status={share} />}
        {!storageOk() && !readOnly && (
          <div className="bg-red-600 px-4 py-1 text-center text-sm font-semibold">
            {t.saveFailed}
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-4 sm:px-4">
        {route === "scoring" && <ScoringPage />}
        {route === "standings" && <StandingsPage />}
        {route === "results" && <ResultsPage />}
        {route === "setup" && (readOnly ? <StandingsPage /> : <SetupPage />)}
      </main>
    </div>
  );
}

/** Tells the organiser whether players and the TV already see the latest results. */
function ShareBar({ status }: { status: ReturnType<typeof useShareStatus> }) {
  if (status === "off") return null;
  const tone =
    status === "error" || status === "unshared"
      ? "bg-accent text-navy"
      : status === "readonly" || status === "checking"
        ? "bg-surface text-white/80"
        : "bg-emerald-700/70 text-white";
  return (
    <div className={`flex items-center justify-center gap-3 px-4 py-1 text-sm font-semibold ${tone}`} role="status">
      <span>
        {status === "live" ? "● " : status === "readonly" ? "● " : ""}
        {t.share[status]}
      </span>
      {(status === "unshared" || status === "error" || status === "pending") && (
        <button className="rounded-full bg-navy px-3 py-0.5 text-xs uppercase text-brand" onClick={() => void shareNow()}>
          {t.share.shareNow}
        </button>
      )}
    </div>
  );
}
