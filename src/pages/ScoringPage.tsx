import { useEffect, useState } from "react";
import CourtCard from "../components/CourtCard";
import RoundClock, { RoundClockBadge } from "../components/RoundClock";
import { Icon, Notice, Num, PageTitle, Segmented, stagger } from "../components/ui";
import { t } from "../i18n/texts";
import { round3Pairings } from "../model/standings";
import {
  activeRound,
  courtLabelNumber,
  currentMatchIndex,
  duelHasStarted,
  duelTotals,
  duelsOfRound,
  leader,
  lineup,
  teamById,
} from "../model/tournament";
import { Duel, ROUNDS, RoundNo, Side, TournamentState } from "../model/types";
import { historyCourt, pushHistory } from "../router";
import { useSessionState } from "../store/hooks";
import { dispatch, useReadOnly, useTournament } from "../store/store";

/** true while the open court was pushed onto the history by this tab, so "back" can pop it. */
let courtPushed = false;

const COURT_KEY = "ui:court";
/** Remember the open court per tab, so the reload after a publish returns to it. */
function rememberCourt(i: number | null) {
  try {
    if (i == null) sessionStorage.removeItem(COURT_KEY);
    else sessionStorage.setItem(COURT_KEY, String(i));
  } catch {
    /* ignore */
  }
}
function sessionCourt(): number | null {
  try {
    const v = sessionStorage.getItem(COURT_KEY);
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}

export default function ScoringPage() {
  const state = useTournament();
  const [round, setRound] = useSessionState<RoundNo>("ui:round", activeRound(state));
  // The open court lives in the browser history, so the tablet's back button closes it.
  const [courtIndex, setCourtIndexState] = useState<number | null>(() => historyCourt() ?? sessionCourt());
  const setCourtIndex = (i: number | null) => {
    rememberCourt(i);
    setCourtIndexState(i);
  };
  const duels = duelsOfRound(state, round);
  const readOnly = useReadOnly();
  const openDuel = !readOnly && courtIndex != null ? duels[courtIndex] : undefined;

  useEffect(() => {
    const onPop = () => {
      courtPushed = false;
      setCourtIndex(historyCourt());
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("app:navigate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("app:navigate", onPop);
    };
  }, []);

  const openCourt = (i: number) => {
    courtPushed = pushHistory({ route: "scoring", court: i });
    setCourtIndex(i);
    window.scrollTo(0, 0);
  };
  const switchCourt = (i: number) => {
    pushHistory({ route: "scoring", court: i }, true);
    setCourtIndex(i);
  };
  const closeCourt = () => {
    if (courtPushed) window.history.back();
    else pushHistory({ route: "scoring" }, true);
    courtPushed = false;
    setCourtIndex(null);
  };

  if (openDuel) {
    return (
      <DuelView
        key={openDuel.id}
        state={state}
        duel={openDuel}
        duels={duels}
        onBack={closeCourt}
        onCourt={switchCourt}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <RoundBar key={round} state={state} round={round} setRound={setRound} readOnly={readOnly} />
      {round === 3 && !readOnly && <Round3Editor state={state} />}
      {!readOnly && <p className="-mt-1 px-1 text-[15px] text-ink2">{t.scoring.pickCourt}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {duels.map((d, i) => (
          <CourtCard
            key={d.id}
            state={state}
            duel={d}
            style={stagger(i, 60)}
            onOpen={readOnly ? undefined : () => openCourt(d.courtIndex)}
          />
        ))}
      </div>
    </div>
  );
}

function RoundBar({
  state,
  round,
  setRound,
  readOnly,
}: {
  state: TournamentState;
  round: RoundNo;
  setRound: (r: RoundNo) => void;
  readOnly: boolean;
}) {
  const closed = state.roundClosed[round - 1];
  const openDuels = duelsOfRound(state, round).filter((d) => !d.closed).length;
  const [confirming, setConfirming] = useState(false);

  const closeRound = () => {
    dispatch({ type: "closeRound", round });
    setConfirming(false);
    if (round < 3) setRound((round + 1) as RoundNo);
  };

  const roundTabs = (
    <Segmented<RoundNo>
      label={t.round(round)}
      size="lg"
      className="w-full sm:max-w-[480px]"
      value={round}
      onChange={setRound}
      options={ROUNDS.map((r) => ({
        value: r,
        label: (
          <>
            {t.round(r)}
            {state.roundClosed[r - 1] && <Icon name="check" className="h-4 w-4 text-good" label={t.scoring.roundClosed} />}
          </>
        ),
      }))}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Title and rounds on the left; the round clock with "Close round" right under it on the right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PageTitle
            title={t.nav.scoring}
            subtitle={`${t.round(round)} · ${state.settings.matchMinutes[round - 1]} min${closed ? ` · ${t.scoring.roundClosed}` : ""}`}
          />
          {roundTabs}
        </div>
        <div className="flex flex-col items-stretch gap-3 empty:hidden sm:w-[380px] sm:shrink-0">
          <RoundClock state={state} round={round} readOnly={readOnly} />
          {readOnly ? null : closed ? (
            <button className="btn-gray" onClick={() => dispatch({ type: "reopenRound", round })}>
              {t.scoring.reopenRound(round)}
            </button>
          ) : (
            <button className="btn-gray" onClick={() => setConfirming(true)} disabled={confirming}>
              <Icon name="flag" className="h-[18px] w-[18px]" />
              {t.scoring.closeRound(round)}
            </button>
          )}
        </div>
      </div>
      {confirming && !closed && (
        <Notice
          tone="warn"
          actions={
            <>
              <button className="btn-gray" onClick={() => setConfirming(false)}>
                {t.cancel}
              </button>
              <button className="btn-tint" onClick={closeRound}>
                {t.scoring.closeRound(round)}
              </button>
            </>
          }
        >
          {t.scoring.confirmCloseRound(round, openDuels)}
          {round === 2 && <span className="block text-[13px] text-ink2">{t.scoring.confirmCloseRound2Extra}</span>}
        </Notice>
      )}
    </div>
  );
}

function Round3Editor({ state }: { state: TournamentState }) {
  const duels = duelsOfRound(state, 3);
  const { unresolved } = round3Pairings(state);
  const ready = state.roundClosed[1];

  return (
    <section className="card anim-rise flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-[22px] font-bold tracking-tight">{t.round3.title}</h2>
          <p className="text-[13px] text-ink2">
            {!ready ? t.round3.notYet : state.round3Edited ? t.round3.edited : t.round3.auto}
          </p>
        </div>
        {ready && (
          <button className="btn-gray" onClick={() => dispatch({ type: "regenerateRound3" })}>
            <Icon name="refresh" className="h-[18px] w-[18px]" />
            {t.round3.regenerate}
          </button>
        )}
      </div>
      {ready && unresolved && <Notice tone="bad">{t.round3.unresolved}</Notice>}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {duels.map((d) => {
          const locked = duelHasStarted(d);
          const select = (side: Side, value: number | null) => (
            <select
              className="field min-w-0 flex-1 font-semibold disabled:opacity-60"
              aria-label={`${t.court(courtLabelNumber(state, d.courtIndex))} – ${side === "a" ? t.csv.teamA : t.csv.teamB}`}
              value={value ?? ""}
              disabled={locked}
              onChange={(e) =>
                dispatch({
                  type: "setRound3Team",
                  courtIndex: d.courtIndex,
                  side,
                  teamId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">{t.tbd}</option>
              {state.teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({t.group(tm.group)})
                </option>
              ))}
            </select>
          );
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-2xl bg-fill/[0.07] p-2">
              <span className="eyebrow w-[72px] shrink-0 pl-1 !text-tint">
                {t.court(courtLabelNumber(state, d.courtIndex))}
              </span>
              {select("a", d.teamA)}
              <span className="text-[13px] text-ink2">{t.vs}</span>
              {select("b", d.teamB)}
              {locked && <Icon name="lock" className="h-4 w-4 text-ink2" label={t.round3.lockedStarted} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DuelView({
  state,
  duel,
  duels,
  onBack,
  onCourt,
}: {
  state: TournamentState;
  duel: Duel;
  duels: Duel[];
  onBack: () => void;
  onCourt: (i: number) => void;
}) {
  const [mode, setMode] = useSessionState<EntryMode>("ui:entryMode", "final");
  const teamA = teamById(state, duel.teamA);
  const teamB = teamById(state, duel.teamB);
  const total = duelTotals(duel);
  const lead = leader(total);

  return (
    <div className="anim-push flex flex-col gap-4">
      {/* Navigation bar: back, and a quick switch to the other courts */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="btn-plain -ml-2 text-[17px]" onClick={onBack}>
          <Icon name="chevronLeft" className="h-6 w-6" />
          {t.scoring.back}
        </button>
        <Segmented<number>
          label={t.scoring.otherCourts}
          size="sm"
          className="w-full sm:w-[360px]"
          value={duel.courtIndex}
          onChange={onCourt}
          options={duels.map((d) => ({ value: d.courtIndex, label: t.court(courtLabelNumber(state, d.courtIndex)) }))}
        />
      </div>

      <PageTitle title={t.court(courtLabelNumber(state, duel.courtIndex))} subtitle={t.round(duel.round)} />

      {/* Duel score – the club's navy, always visible while scrolling */}
      <div className="sticky top-[calc(8px+env(safe-area-inset-top))] z-20 overflow-hidden rounded-[22px] bg-navy px-4 py-3 text-white shadow-[0_14px_36px_-16px_rgb(1_19_91/0.7)] sm:px-6">
        <div className="flex items-center gap-3">
          <TeamTotal name={teamA?.name} score={total.a} isLead={lead === "a"} align="left" />
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{t.scoring.duelTotal}</span>
            <RoundClockBadge state={state} round={duel.round} />
            {duel.closed ? (
              <span className="chip bg-white/15 !py-0.5 text-[11px] text-white">
                <Icon name="check" className="h-3 w-3" />
                {t.scoring.duelClosed}
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-yellow" />
            )}
          </div>
          <TeamTotal name={teamB?.name} score={total.b} isLead={lead === "b"} align="right" />
        </div>
      </div>

      {!teamA || !teamB ? <Notice tone="info">{t.scoring.noTeams}</Notice> : null}

      {/* How results are entered: final totals (default) or live +1/+2 counter */}
      <Segmented<EntryMode>
        label={t.scoring.entryMode}
        size="lg"
        value={mode}
        onChange={setMode}
        options={[
          { value: "final", label: t.scoring.modeFinal },
          { value: "live", label: t.scoring.modeLive },
        ]}
      />

      {mode === "final" ? <FinalEntry state={state} duel={duel} /> : <LiveEntry state={state} duel={duel} />}

      {/* Duel actions */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        {duel.closed ? (
          <button className="btn-gray" onClick={() => dispatch({ type: "reopenDuel", duelId: duel.id })}>
            {t.scoring.reopenDuel}
          </button>
        ) : (
          <button className="btn-yellow" onClick={() => dispatch({ type: "closeDuel", duelId: duel.id })}>
            <Icon name="check" className="h-[18px] w-[18px]" />
            {t.scoring.closeDuel}
          </button>
        )}
        <label className="ml-auto flex items-center gap-2">
          <span className="text-[15px] text-ink2">{t.scoring.walkover}</span>
          <select
            className="field w-auto"
            value={duel.walkover ?? ""}
            onChange={(e) => {
              const side = (e.target.value || null) as Side | null;
              dispatch({ type: "setWalkover", duelId: duel.id, side });
              if (side) setMode("final");
            }}
          >
            <option value="">{t.scoring.walkoverNone}</option>
            <option value="a">{t.scoring.walkoverNoShow(teamA?.name ?? t.tbd)}</option>
            <option value="b">{t.scoring.walkoverNoShow(teamB?.name ?? t.tbd)}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function TeamTotal({
  name,
  score,
  isLead,
  align,
}: {
  name?: string;
  score: number;
  isLead: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Num value={score} className={`text-[44px] leading-none sm:text-[52px] ${isLead ? "text-yellow" : "text-white"}`} />
      <span className={`truncate text-[17px] font-semibold sm:text-[20px] ${isLead ? "text-white" : "text-white/75"}`}>
        {name ?? t.tbd}
      </span>
    </div>
  );
}

function ScorePanel({
  name,
  players,
  score,
  isLead,
  onAdd,
}: {
  name?: string;
  players: string[];
  score: number;
  isLead: boolean;
  onAdd: (delta: number) => void;
}) {
  return (
    <div className={`card flex flex-col gap-3 p-4 transition-shadow ${isLead ? "ring-2 ring-yellow" : ""}`}>
      <div className="text-center">
        <div className="truncate text-[20px] font-semibold">{name ?? t.tbd}</div>
        <div className="min-h-[1.25rem] truncate text-[13px] text-ink2">{players.join(" · ")}</div>
      </div>
      <div className="text-center">
        <Num value={score} className="text-[88px] leading-none sm:text-[104px]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex min-h-[84px] flex-col items-center justify-center rounded-[18px] bg-fill/[0.14] text-ink transition active:scale-[0.97]"
          onClick={() => onAdd(1)}
        >
          <span className="num text-[34px] leading-none">{t.scoring.plus1}</span>
          <span className="text-[12px] font-medium text-ink2">{t.scoring.plus1Hint}</span>
        </button>
        <button
          className="flex min-h-[84px] flex-col items-center justify-center rounded-[18px] bg-yellow text-navy transition active:scale-[0.97]"
          onClick={() => onAdd(2)}
        >
          <span className="num text-[34px] leading-none">{t.scoring.plus2}</span>
          <span className="text-[12px] font-medium text-navy/70">{t.scoring.plus2Hint}</span>
        </button>
      </div>
      <button className="btn-plain mx-auto text-[15px]" onClick={() => onAdd(-1)} disabled={score <= 0}>
        <Icon name="rotate" className="h-4 w-4" />
        {t.scoring.minus1} {t.scoring.minus1Hint}
      </button>
    </div>
  );
}

type EntryMode = "final" | "live";

/** Shared column layout of the final-score list: match · team A · ":" · team B · action. */
const ROW =
  "grid grid-cols-[minmax(0,1fr)_3.6rem_0.5rem_3.6rem_4.6rem] items-center gap-x-1.5 sm:grid-cols-[minmax(0,1fr)_6rem_1rem_6rem_7.5rem] sm:gap-x-2";

/**
 * Main way to score: the players report each match result after playing
 * ("10 to 15") and the organiser types both totals. Save closes the match.
 */
function FinalEntry({ state, duel }: { state: TournamentState; duel: Duel }) {
  const teamA = teamById(state, duel.teamA);
  const teamB = teamById(state, duel.teamB);
  const running = currentMatchIndex(duel);
  const allSaved = running === -1;

  return (
    <div className="card flex flex-col p-2 sm:p-3">
        <p className="px-2 pb-2 pt-1 text-[14px] text-ink2">{duel.walkover ? t.scoring.walkoverHint : t.scoring.finalHint}</p>
        <div className={`${ROW} pb-1`}>
          <span />
          <span className="truncate pb-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-ink2">
            {teamA?.name ?? t.tbd}
          </span>
          <span />
          <span className="truncate pb-1 text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-ink2">
            {teamB?.name ?? t.tbd}
          </span>
          <span />
        </div>
        {duel.matches.map((m, i) => (
          <FinalRow key={m.type} state={state} duel={duel} index={i} isNext={i === running} />
        ))}
        {allSaved && !duel.closed && (
          <button
            className="btn-yellow anim-rise m-2 mt-3 min-h-[56px] text-[19px]"
            onClick={() => dispatch({ type: "closeDuel", duelId: duel.id })}
          >
            <Icon name="check" className="h-5 w-5" />
            {t.scoring.closeDuel}
          </button>
        )}
    </div>
  );
}

function FinalRow({
  state,
  duel,
  index,
  isNext,
}: {
  state: TournamentState;
  duel: Duel;
  index: number;
  isNext: boolean;
}) {
  const m = duel.matches[index];
  const lead = leader(m.score);
  const set = (a: number, b: number) => dispatch({ type: "setScore", duelId: duel.id, matchIndex: index, a, b });
  const players = [lineup(teamById(state, duel.teamA), index), lineup(teamById(state, duel.teamB), index)];
  const input = (side: "a" | "b") => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      aria-label={`${t.matchTypes[m.type]} – ${side === "a" ? t.csv.teamA : t.csv.teamB}`}
      className={`field num h-14 px-1 text-center text-[24px] sm:h-16 sm:text-[32px] ${
        lead === side ? "hi ring-2 ring-yellow" : ""
      }`}
      placeholder="0"
      value={m.score[side] || ""}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = Number(e.target.value) || 0;
        if (side === "a") set(v, m.score.b);
        else set(m.score.a, v);
      }}
    />
  );
  return (
    <div className={`${ROW} relative my-0.5 rounded-2xl py-2 transition-colors ${isNext ? "bg-fill/[0.09]" : ""}`}>
      {isNext && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-1 rounded-full bg-yellow" />}
      <div className="min-w-0 pl-3">
        <div className="truncate text-[16px] font-semibold sm:text-[17px]">{t.matchTypes[m.type]}</div>
        <div className="hidden truncate text-[12px] text-ink2 sm:block">
          {players[0].join(" · ")} vs {players[1].join(" · ")}
        </div>
        {isNext && <div className="text-[12px] font-semibold text-ink2 sm:hidden">{t.scoring.upcoming}</div>}
      </div>
      {input("a")}
      <span className="text-center text-[20px] font-semibold text-ink2">:</span>
      {input("b")}
      <div className="flex items-center justify-center pr-2">
        {m.closed ? (
          <span className="chip anim-rise bg-good/12 text-good">
            <Icon name="check" className="h-4 w-4" />
            {t.scoring.saved}
          </span>
        ) : (
          <button
            className="btn-tint min-h-[44px] w-full px-2 sm:px-3"
            onClick={() => dispatch({ type: "closeMatch", duelId: duel.id, matchIndex: index })}
          >
            {t.scoring.save}
          </button>
        )}
      </div>
    </div>
  );
}

/** Point-by-point counter for when someone scores live at the court. */
function LiveEntry({ state, duel }: { state: TournamentState; duel: Duel }) {
  const running = currentMatchIndex(duel);
  const [selected, setSelected] = useState(running >= 0 ? running : 3);
  const match = duel.matches[selected];
  const teamA = teamById(state, duel.teamA);
  const teamB = teamById(state, duel.teamB);
  const matchLead = leader(match.score);
  const ids = { duelId: duel.id, matchIndex: selected };

  const closeMatch = () => {
    dispatch({ type: "closeMatch", ...ids });
    if (selected < 3) setSelected(selected + 1);
  };

  return (
    <>
      {/* The four matches */}
      <div className="grid grid-cols-4 gap-2">
        {duel.matches.map((m, i) => {
          const status = m.closed ? t.scoring.closed : i === running ? t.scoring.running : t.scoring.upcoming;
          const active = i === selected;
          return (
            <button
              key={m.type}
              onClick={() => setSelected(i)}
              aria-pressed={active}
              className={`flex flex-col items-center rounded-[18px] px-1 py-2.5 transition duration-200 active:scale-[0.97] ${
                active ? "bg-tint text-on-tint shadow-[0_10px_24px_-12px_rgb(1_19_91/0.7)]" : "card"
              }`}
            >
              <span className="text-[14px] font-semibold sm:text-[16px]">{t.matchTypes[m.type]}</span>
              <span className="num text-[24px] leading-tight sm:text-[28px]">
                {m.score.a}:{m.score.b}
              </span>
              <span className={`flex items-center gap-1 text-[11px] font-semibold ${active ? "opacity-80" : "text-ink2"}`}>
                {m.closed ? (
                  <Icon name="check" className="h-3 w-3" />
                ) : i === running ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow" />
                ) : null}
                {status}
              </span>
            </button>
          );
        })}
      </div>

      <p className="px-1 text-[14px] text-ink2">{t.scoring.howTo(t.matchTypes[match.type])}</p>

      {/* Scoring panel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_minmax(240px,280px)_1fr]">
        <ScorePanel
          name={teamA?.name}
          players={lineup(teamA, selected)}
          score={match.score.a}
          isLead={matchLead === "a"}
          onAdd={(delta) => dispatch({ type: "addPoints", ...ids, side: "a", delta })}
        />
        <div className="order-first flex flex-col gap-3 md:order-none">
          {match.closed ? (
            <button className="btn-gray min-h-[52px]" onClick={() => dispatch({ type: "reopenMatch", ...ids })}>
              {t.scoring.reopenMatch}
            </button>
          ) : (
            <button className="btn-tint min-h-[52px]" onClick={closeMatch}>
              {t.scoring.closeMatch}
              <Icon name="chevronRight" className="h-5 w-5" />
            </button>
          )}
        </div>
        <ScorePanel
          name={teamB?.name}
          players={lineup(teamB, selected)}
          score={match.score.b}
          isLead={matchLead === "b"}
          onAdd={(delta) => dispatch({ type: "addPoints", ...ids, side: "b", delta })}
        />
      </div>
    </>
  );
}
