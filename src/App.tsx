import { Icon, IconName, Notice } from "./components/ui";
import { t } from "./i18n/texts";
import DisplayPage from "./pages/DisplayPage";
import ResultsPage from "./pages/ResultsPage";
import ScoringPage from "./pages/ScoringPage";
import SetupPage from "./pages/SetupPage";
import StandingsPage from "./pages/StandingsPage";
import { Route, hrefFor, navigate, useRoute } from "./router";
import { ShareStatus, shareNow, storageOk, useReadOnly, useShareStatus, useTournament } from "./store/store";

const TABS: Array<{ route: Route; label: string; icon: IconName }> = [
  { route: "scoring", label: t.nav.scoring, icon: "ball" },
  { route: "standings", label: t.nav.standings, icon: "chart" },
  { route: "results", label: t.nav.results, icon: "trophy" },
  { route: "setup", label: t.nav.setup, icon: "sliders" },
];

export default function App() {
  const route = useRoute();
  const state = useTournament();
  const readOnly = useReadOnly();
  const share = useShareStatus();

  if (route === "display") return <DisplayPage />;

  const tabs = TABS.filter((tab) => !(readOnly && tab.route === "setup"));
  const page = route === "setup" && readOnly ? "standings" : route;

  return (
    <div className="min-h-screen pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 pt-[calc(14px+env(safe-area-inset-top))] sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-navy text-yellow">
            <Icon name="ball" className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold">{state.settings.title}</div>
            <div className="truncate text-[12px] text-ink2">
              {state.settings.subtitle} · {state.settings.date}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <SharePill status={share} />
        </div>
      </header>

      {(share === "offline" || share === "error") && (
        <div className="mx-auto mt-3 max-w-[1180px] px-4 sm:px-6">
          <Notice
            tone="warn"
            actions={
              share === "error" ? (
                <button className="btn-tint min-h-[38px] px-4 text-[15px]" onClick={() => void shareNow()}>
                  {t.share.shareNow}
                </button>
              ) : undefined
            }
          >
            {share === "offline" ? t.share.offlineHelp : t.share.errorHelp}
          </Notice>
        </div>
      )}

      {!storageOk() && !readOnly && (
        <div className="mx-auto mt-3 max-w-[1180px] px-4 sm:px-6">
          <div className="rounded-2xl bg-bad px-4 py-2 text-[15px] font-semibold text-white">{t.saveFailed}</div>
        </div>
      )}

      <main key={page} className="anim-rise mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6">
        {page === "scoring" && <ScoringPage />}
        {page === "standings" && <StandingsPage />}
        {page === "results" && <ResultsPage />}
        {page === "setup" && <SetupPage />}
      </main>

      <footer className="mx-auto mt-8 w-full max-w-[1180px] px-4 pb-2 text-center text-[13px] text-ink2 sm:px-6">
        {t.credit.by}{" "}
        <a
          href={t.credit.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-tint underline-offset-2 hover:underline"
        >
          {t.credit.name}
        </a>
      </footer>

      <TabBar tabs={tabs} route={page} />
    </div>
  );
}

/** Floating, frosted tab bar at the bottom – within reach of a thumb on a tablet. */
function TabBar({ tabs, route }: { tabs: typeof TABS; route: Route }) {
  const hashMode = import.meta.env.VITE_HASH_ROUTER === "1";
  const item = "flex min-w-[60px] flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 sm:min-w-[84px] sm:flex-row sm:gap-2 sm:px-4 sm:text-[15px]";
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto flex w-max max-w-[calc(100%-24px)] gap-1 rounded-full p-1.5"
    >
      {tabs.map((tab) => {
        const active = tab.route === route;
        return (
          <a
            key={tab.route}
            href={hrefFor(tab.route)}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(tab.route);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`${item} ${active ? "bg-tint text-on-tint" : "text-ink2 hover:text-ink"}`}
          >
            <Icon name={tab.icon} className="h-[22px] w-[22px]" />
            <span>{tab.label}</span>
          </a>
        );
      })}
      <span className="mx-0.5 my-2 w-px bg-line/10" aria-hidden />
      <a
        href={hrefFor("display")}
        target={hashMode ? undefined : "_blank"}
        rel="noreferrer"
        onClick={(e) => {
          // On claude.ai the TV screen opens inside the page; never leave #display in the address.
          if (!hashMode) return;
          e.preventDefault();
          navigate("display");
        }}
        className={`${item} text-ink2 hover:text-ink`}
      >
        <Icon name="tv" className="h-[22px] w-[22px]" />
        <span>{t.nav.display}</span>
      </a>
    </nav>
  );
}

/** Tells the organiser whether players and the TV already see the latest results. */
function SharePill({ status }: { status: ShareStatus }) {
  if (status === "off") return null;
  if (status === "offline") {
    return (
      <span className="chip bg-warn/15 text-warn" role="status">
        <Icon name="alert" className="h-4 w-4" />
        <span className="max-w-[48vw] truncate">{t.share.offline}</span>
      </span>
    );
  }
  if (status === "unshared" || status === "error" || status === "pending") {
    return (
      <button
        onClick={() => void shareNow()}
        className={`chip ${status === "pending" ? "bg-fill/[0.14] text-ink2" : "bg-warn/15 text-warn"}`}
        title={t.share[status]}
      >
        {status === "pending" ? <span className="spinner" /> : <Icon name="alert" className="h-4 w-4" />}
        <span className="hidden sm:inline">{t.share[status]}</span>
        <span className="rounded-full bg-tint px-2 py-0.5 text-[12px] text-on-tint">{t.share.shareNow}</span>
      </button>
    );
  }
  const tone =
    status === "live" ? "text-good bg-good/10" : status === "readonly" ? "text-navy bg-yellow" : "text-ink2 bg-fill/[0.12]";
  return (
    <span className={`chip ${tone}`} role="status">
      {status === "publishing" || status === "checking" || status === "connecting" ? (
        <span className="spinner" />
      ) : (
        <span className={`live-dot ${status === "readonly" ? "bg-navy text-navy/40" : "bg-good text-good/40"}`} />
      )}
      <span className="max-w-[48vw] truncate">{t.share[status]}</span>
    </span>
  );
}
