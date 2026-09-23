import { useEffect, useState } from "react";
import CourtCard from "../components/CourtCard";
import MatchTimer from "../components/MatchTimer";
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
import { useNow, useSessionState } from "../store/hooks";
import { dispatch, useTournament } from "../store/store";

/** true while the open court was pushed onto the history by this tab, so "back" can pop it. */
let courtPushed = false;

export default function ScoringPage() {
  const state = useTournament();
  const [round, setRound] = useSessionState<RoundNo>("ui:round", activeRound(state));
  // The open court lives in the browser history, so the tablet's back button closes it.
  const [courtIndex, setCourtIndex] = useState<number | null>(historyCourt);
  const now = useNow(500);
  const duels = duelsOfRound(state, round);
  const openDuel = courtIndex != null ? duels[courtIndex] : undefined;

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
    <div className="flex flex-col gap-4">
      <RoundBar key={round} state={state} round={round} setRound={setRound} />
      {round === 3 && <Round3Editor state={state} />}
      <p className="subline text-base">👆 {t.scoring.pickCourt}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {duels.map((d) => (
          <CourtCard key={d.id} state={state} duel={d} now={now} onOpen={() => openCourt(d.courtIndex)} />
        ))}
      </div>
    </div>
  );
}

function RoundBar({
  state,
  round,
  setRound,
}: {
  state: TournamentState;
  round: RoundNo;
  setRound: (r: RoundNo) => void;
}) {
  const closed = state.roundClosed[round - 1];
  const openDuels = duelsOfRound(state, round).filter((d) => !d.closed).length;
  const [confirming, setConfirming] = useState(false);

  const closeRound = () => {
    dispatch({ type: "closeRound", round });
    setConfirming(false);
    if (round < 3) setRound((round + 1) as RoundNo);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 gap-2">
          {ROUNDS.map((r) => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`btn flex-1 whitespace-nowrap px-2 text-base sm:flex-none sm:px-6 sm:text-xl ${
                r === round ? "bg-brand text-navy" : "bg-surface text-white ring-1 ring-white/15"
              }`}
            >
              {t.round(r)}
              {state.roundClosed[r - 1] && <span aria-label={t.scoring.roundClosed}>✓</span>}
            </button>
          ))}
        </div>
        <div className="subline hidden text-sm md:block">
          {state.settings.matchMinutes[round - 1]} min · {closed ? t.scoring.roundClosed : ""}
        </div>
        {closed ? (
          <button className="btn-secondary" onClick={() => dispatch({ type: "reopenRound", round })}>
            {t.scoring.reopenRound(round)}
          </button>
        ) : (
          <button className="btn-accent" onClick={() => setConfirming(true)} disabled={confirming}>
            {t.scoring.closeRound(round)}
          </button>
        )}
      </div>
      {confirming && !closed && (
        <div className="card flex flex-wrap items-center gap-3 p-3 ring-2 ring-accent">
          <p className="mr-auto font-semibold">
            {t.scoring.confirmCloseRound(round, openDuels)}
            {round === 2 && <span className="block text-sm text-accent">{t.scoring.confirmCloseRound2Extra}</span>}
          </p>
          <button className="btn-secondary" onClick={() => setConfirming(false)}>
            {t.cancel}
          </button>
          <button className="btn-accent" onClick={closeRound}>
            {t.scoring.closeRound(round)}
          </button>
        </div>
      )}
    </div>
  );
}

function Round3Editor({ state }: { state: TournamentState }) {
  const duels = duelsOfRound(state, 3);
  const { unresolved } = round3Pairings(state);
  const ready = state.roundClosed[1];

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="headline mr-auto text-2xl">{t.round3.title}</h2>
        {ready && (
          <button className="btn-secondary" onClick={() => dispatch({ type: "regenerateRound3" })}>
            ↻ {t.round3.regenerate}
          </button>
        )}
      </div>
      <p className="text-sm text-white/80">
        {!ready ? t.round3.notYet : state.round3Edited ? t.round3.edited : t.round3.auto}
      </p>
      {ready && unresolved && (
        <p className="rounded-lg bg-red-700/70 px-3 py-2 font-semibold ring-2 ring-red-400">⚠ {t.round3.unresolved}</p>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {duels.map((d) => {
          const locked = duelHasStarted(d);
          const select = (side: Side, value: number | null) => (
            <select
              className="field font-cond text-lg font-bold uppercase"
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
                <option key={tm.id} value={tm.id} className="bg-navy">
                  {tm.name} ({t.group(tm.group)})
                </option>
              ))}
            </select>
          );
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-xl bg-navy/50 p-2">
              <span className="headline w-24 shrink-0 text-xl">{t.court(courtLabelNumber(state, d.courtIndex))}</span>
              {select("a", d.teamA)}
              <span className="subline">{t.vs}</span>
              {select("b", d.teamB)}
              {locked && (
                <span title={t.round3.lockedStarted} aria-label={t.round3.lockedStarted}>
                  🔒
                </span>
              )}
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
    <div className="flex flex-col gap-3">
      {/* Where am I + way back + quick switch to the other courts */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary min-h-[56px] px-4 text-lg" onClick={onBack}>
          ← {t.scoring.back}
        </button>
        <div className="mr-auto leading-none">
          <div className="headline text-3xl">{t.court(courtLabelNumber(state, duel.courtIndex))}</div>
          <div className="subline text-sm">{t.round(duel.round)}</div>
        </div>
        <div className="flex gap-1" role="group" aria-label={t.scoring.otherCourts}>
          {duels.map((d) => (
            <button
              key={d.id}
              onClick={() => onCourt(d.courtIndex)}
              aria-current={d.id === duel.id}
              className={`btn min-h-[48px] whitespace-nowrap px-3 text-base ${
                d.id === duel.id ? "bg-brand text-navy" : "bg-surface text-white ring-1 ring-white/15"
              }`}
            >
              {t.court(courtLabelNumber(state, d.courtIndex))}
            </button>
          ))}
        </div>
      </div>

      {/* Duel score – always visible */}
      <div className="card sticky top-[var(--header-h,0px)] z-20 flex items-center gap-2 bg-surface px-3 py-2">
        <TeamTotal name={teamA?.name} score={total.a} isLead={lead === "a"} align="right" />
        <div className="flex flex-col items-center px-1">
          <span className="subline text-[10px] sm:text-xs">{t.scoring.duelTotal}</span>
          <span className="font-cond text-2xl font-bold text-white/50">:</span>
          {duel.closed && <span className="text-xs font-semibold text-accent">{t.scoring.duelClosed}</span>}
        </div>
        <TeamTotal name={teamB?.name} score={total.b} isLead={lead === "b"} align="left" />
      </div>

      {!teamA || !teamB ? <p className="card p-4 text-center">{t.scoring.noTeams}</p> : null}

      {/* How results are entered: final totals (default) or live +1/+2 counter */}
      <div className="flex rounded-xl bg-navy/60 p-1" role="tablist" aria-label={t.scoring.entryMode}>
        {(["final", "live"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`btn flex-1 text-base sm:text-lg ${mode === m ? "bg-brand text-navy" : "bg-transparent text-white"}`}
          >
            {m === "final" ? t.scoring.modeFinal : t.scoring.modeLive}
          </button>
        ))}
      </div>

      {mode === "final" ? (
        <FinalEntry state={state} duel={duel} />
      ) : (
        <LiveEntry state={state} duel={duel} />
      )}

      {/* Duel actions */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        {duel.closed ? (
          <button className="btn-secondary" onClick={() => dispatch({ type: "reopenDuel", duelId: duel.id })}>
            {t.scoring.reopenDuel}
          </button>
        ) : (
          <button className="btn-accent" onClick={() => dispatch({ type: "closeDuel", duelId: duel.id })}>
            {t.scoring.closeDuel} ✓
          </button>
        )}
        <label className="flex items-center gap-2">
          <span className="subline text-sm">{t.scoring.walkover}</span>
          <select
            className="field w-auto"
            value={duel.walkover ?? ""}
            onChange={(e) => {
              const side = (e.target.value || null) as Side | null;
              dispatch({ type: "setWalkover", duelId: duel.id, side });
              if (side) setMode("final");
            }}
          >
            <option value="" className="bg-navy">
              {t.scoring.walkoverNone}
            </option>
            <option value="a" className="bg-navy">
              {t.scoring.walkoverNoShow(teamA?.name ?? t.tbd)}
            </option>
            <option value="b" className="bg-navy">
              {t.scoring.walkoverNoShow(teamB?.name ?? t.tbd)}
            </option>
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
    <div
      className={`flex min-w-0 flex-1 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <span className={`score text-5xl sm:text-6xl ${isLead ? "text-brand" : "text-white"}`}>{score}</span>
      <span
        className={`truncate font-cond text-lg font-bold uppercase sm:text-2xl ${isLead ? "text-brand" : "text-white"}`}
      >
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
    <div className={`card flex flex-col gap-3 p-3 ${isLead ? "ring-4 ring-brand" : ""}`}>
      <div className="text-center">
        <div className={`truncate font-cond text-2xl font-bold uppercase ${isLead ? "text-brand" : "text-white"}`}>
          {name ?? t.tbd}
        </div>
        <div className="min-h-[1.25rem] truncate text-sm text-accent">{players.join(" · ")}</div>
      </div>
      <div className={`score text-center text-[80px] sm:text-[96px] ${isLead ? "text-brand" : "text-white"}`}>
        {score}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn flex min-h-[80px] flex-col bg-white text-navy hover:bg-white/90"
          onClick={() => onAdd(1)}
        >
          <span className="text-4xl leading-none">{t.scoring.plus1}</span>
          <span className="text-xs">{t.scoring.plus1Hint}</span>
        </button>
        <button className="btn-primary flex min-h-[80px] flex-col" onClick={() => onAdd(2)}>
          <span className="text-4xl leading-none">{t.scoring.plus2}</span>
          <span className="text-xs">{t.scoring.plus2Hint}</span>
        </button>
      </div>
      <button className="btn-secondary min-h-[48px]" onClick={() => onAdd(-1)} disabled={score <= 0}>
        {t.scoring.minus1} <span className="text-sm normal-case">{t.scoring.minus1Hint}</span>
      </button>
    </div>
  );
}

type EntryMode = "final" | "live";

/**
 * Main way to score: the players report each match result after playing
 * ("10 to 15") and the organiser types both totals. Save closes the match.
 */
function FinalEntry({ state, duel }: { state: TournamentState; duel: Duel }) {
  const teamA = teamById(state, duel.teamA);
  const teamB = teamById(state, duel.teamB);
  const running = currentMatchIndex(duel);
  const allSaved = running === -1;
  const minutes = state.settings.matchMinutes[duel.round - 1];
  const clockIndex = running >= 0 ? running : 3;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
      <div className="card flex flex-col gap-2 p-3">
        <p className="text-sm text-white/80">{duel.walkover ? t.scoring.walkoverHint : t.scoring.finalHint}</p>
        <div className="grid grid-cols-[minmax(0,1fr)_5rem_auto_5rem_minmax(5.5rem,auto)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto_7rem_8rem]">
          <span />
          <span className="truncate text-center font-cond text-sm font-bold uppercase sm:text-lg">
            {teamA?.name ?? t.tbd}
          </span>
          <span />
          <span className="truncate text-center font-cond text-sm font-bold uppercase sm:text-lg">
            {teamB?.name ?? t.tbd}
          </span>
          <span />
          {duel.matches.map((m, i) => (
            <FinalRow key={m.type} state={state} duel={duel} index={i} isNext={i === running} />
          ))}
        </div>
        {allSaved && !duel.closed && (
          <button
            className="btn-accent mt-2 min-h-[64px] text-xl"
            onClick={() => dispatch({ type: "closeDuel", duelId: duel.id })}
          >
            {t.scoring.closeDuel} ✓
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="subline text-center text-sm">
          {t.scoring.clockFor} {t.matchTypes[duel.matches[clockIndex].type]}
        </div>
        <MatchTimer
          timer={duel.matches[clockIndex].timer}
          minutes={minutes}
          onStart={() => dispatch({ type: "timerStart", duelId: duel.id, matchIndex: clockIndex })}
          onPause={() => dispatch({ type: "timerPause", duelId: duel.id, matchIndex: clockIndex })}
          onReset={() => dispatch({ type: "timerReset", duelId: duel.id, matchIndex: clockIndex })}
        />
      </div>
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
      className={`field h-16 px-1 text-center font-cond text-4xl font-extrabold ${
        lead === side ? "text-brand ring-2 ring-brand" : ""
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
    <>
      <div className={`min-w-0 rounded-lg px-2 py-1 ${isNext ? "bg-accent/20 ring-2 ring-accent" : ""}`}>
        <div className="font-cond text-lg font-bold uppercase text-brand sm:text-2xl">{t.matchTypes[m.type]}</div>
        <div className="hidden truncate text-xs text-accent sm:block">
          {players[0].join(" · ")} vs {players[1].join(" · ")}
        </div>
      </div>
      {input("a")}
      <span className="font-cond text-2xl font-bold text-white/50">:</span>
      {input("b")}
      {m.closed ? (
        <span className="text-center text-sm font-bold uppercase text-emerald-300">✓ {t.scoring.saved}</span>
      ) : (
        <button
          className="btn-primary min-h-[56px] px-2"
          onClick={() => dispatch({ type: "closeMatch", duelId: duel.id, matchIndex: index })}
        >
          {t.scoring.save} ✓
        </button>
      )}
    </>
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
  const minutes = state.settings.matchMinutes[duel.round - 1];
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
        return (
          <button
            key={m.type}
            onClick={() => setSelected(i)}
            className={`card flex flex-col items-center px-1 py-2 transition ${
              i === selected ? "bg-surface ring-4 ring-brand" : m.closed ? "opacity-70" : ""
            } ${i === running && i !== selected ? "ring-2 ring-accent" : ""}`}
          >
            <span className="font-cond text-base font-bold uppercase text-brand sm:text-xl">
              {t.matchTypes[m.type]}
            </span>
            <span className="score text-2xl sm:text-3xl">
              {m.score.a}:{m.score.b}
            </span>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wide sm:text-xs ${
                i === running ? "text-accent" : "text-white/60"
              }`}
            >
              {m.closed ? "✓ " : i === running ? "● " : ""}
              {status}
            </span>
          </button>
        );
      })}
    </div>

    <p className="rounded-xl bg-navy/60 px-3 py-2 text-sm text-white/90 sm:text-base">
      {t.scoring.howTo(t.matchTypes[match.type])}
    </p>

    {/* Scoring panel */}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(220px,260px)_1fr]">
      <ScorePanel
        name={teamA?.name}
        players={lineup(teamA, selected)}
        score={match.score.a}
        isLead={matchLead === "a"}
        onAdd={(delta) => dispatch({ type: "addPoints", ...ids, side: "a", delta })}
      />
      <div className="order-first flex flex-col gap-3 md:order-none">
        <div className="text-center">
          <div className="headline text-3xl">{t.matchTypes[match.type]}</div>
          <div className="subline text-sm">
            {match.closed ? t.scoring.closed : selected === running ? t.scoring.running : t.scoring.upcoming}
          </div>
        </div>
        <MatchTimer
          timer={match.timer}
          minutes={minutes}
          onStart={() => dispatch({ type: "timerStart", ...ids })}
          onPause={() => dispatch({ type: "timerPause", ...ids })}
          onReset={() => dispatch({ type: "timerReset", ...ids })}
        />
        {match.closed ? (
          <button className="btn-secondary min-h-[64px]" onClick={() => dispatch({ type: "reopenMatch", ...ids })}>
            {t.scoring.reopenMatch}
          </button>
        ) : (
          <button className="btn-primary min-h-[64px] text-xl" onClick={closeMatch}>
            {t.scoring.closeMatch} →
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
