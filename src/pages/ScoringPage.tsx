import { useState } from "react";
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
import { useNow, useSessionState } from "../store/hooks";
import { dispatch, useTournament } from "../store/store";

export default function ScoringPage() {
  const state = useTournament();
  const [round, setRound] = useSessionState<RoundNo>("ui:round", activeRound(state));
  const [courtIndex, setCourtIndex] = useSessionState<number | null>("ui:court", null);
  const now = useNow(500);
  const duels = duelsOfRound(state, round);
  const openDuel = courtIndex != null ? duels[courtIndex] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <RoundBar state={state} round={round} setRound={setRound} />

      {openDuel ? (
        <DuelView
          key={openDuel.id}
          state={state}
          duel={openDuel}
          duels={duels}
          onBack={() => setCourtIndex(null)}
          onCourt={setCourtIndex}
        />
      ) : (
        <>
          {round === 3 && <Round3Editor state={state} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {duels.map((d) => (
              <CourtCard key={d.id} state={state} duel={d} now={now} onOpen={() => setCourtIndex(d.courtIndex)} />
            ))}
          </div>
        </>
      )}
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

  const closeRound = () => {
    let msg = t.scoring.confirmCloseRound(round, openDuels);
    if (round === 2) msg += `\n\n${t.scoring.confirmCloseRound2Extra}`;
    if (!window.confirm(msg)) return;
    dispatch({ type: "closeRound", round });
    if (round < 3) setRound((round + 1) as RoundNo);
  };

  return (
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
        <button className="btn-accent" onClick={closeRound}>
          {t.scoring.closeRound(round)}
        </button>
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
  const running = currentMatchIndex(duel);
  const [selected, setSelected] = useState(running >= 0 ? running : 3);
  const [manual, setManual] = useState(duel.walkover != null);
  const match = duel.matches[selected];
  const teamA = teamById(state, duel.teamA);
  const teamB = teamById(state, duel.teamB);
  const total = duelTotals(duel);
  const lead = leader(total);
  const matchLead = leader(match.score);
  const minutes = state.settings.matchMinutes[duel.round - 1];
  const ids = { duelId: duel.id, matchIndex: selected };

  const closeMatch = () => {
    dispatch({ type: "closeMatch", ...ids });
    if (selected < 3) setSelected(selected + 1);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Court switcher */}
      <div className="flex gap-2">
        <button className="btn-secondary px-3" onClick={onBack} aria-label={t.scoring.back}>
          ← <span className="hidden sm:inline">{t.scoring.back}</span>
        </button>
        {duels.map((d) => (
          <button
            key={d.id}
            onClick={() => onCourt(d.courtIndex)}
            className={`btn min-w-0 flex-1 whitespace-nowrap px-1 text-base sm:text-xl ${
              d.id === duel.id ? "bg-brand text-navy" : "bg-surface text-white ring-1 ring-white/15"
            }`}
          >
            {t.court(courtLabelNumber(state, d.courtIndex))}
          </button>
        ))}
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
              if (side) setManual(true);
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
        <button className="btn-secondary ml-auto" onClick={() => setManual(!manual)}>
          ✎ {t.scoring.manualEntry}
        </button>
        {manual && <ManualEntry duel={duel} teamA={teamA?.name} teamB={teamB?.name} />}
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
      <div className={`score text-center text-[96px] sm:text-[128px] ${isLead ? "text-brand" : "text-white"}`}>
        {score}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn flex min-h-[88px] flex-col bg-white text-navy hover:bg-white/90"
          onClick={() => onAdd(1)}
        >
          <span className="text-4xl leading-none">{t.scoring.plus1}</span>
          <span className="text-xs">{t.scoring.plus1Hint}</span>
        </button>
        <button className="btn-primary flex min-h-[88px] flex-col" onClick={() => onAdd(2)}>
          <span className="text-4xl leading-none">{t.scoring.plus2}</span>
          <span className="text-xs">{t.scoring.plus2Hint}</span>
        </button>
      </div>
      <button className="btn-secondary min-h-[56px]" onClick={() => onAdd(-1)} disabled={score <= 0}>
        {t.scoring.minus1} <span className="text-sm normal-case">{t.scoring.minus1Hint}</span>
      </button>
    </div>
  );
}

function ManualEntry({ duel, teamA, teamB }: { duel: Duel; teamA?: string; teamB?: string }) {
  return (
    <div className="w-full">
      {duel.walkover && <p className="mb-2 text-sm text-accent">{t.scoring.walkoverHint}</p>}
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <span />
        <span className="truncate text-center font-cond font-bold uppercase">{teamA ?? t.tbd}</span>
        <span className="truncate text-center font-cond font-bold uppercase">{teamB ?? t.tbd}</span>
        {duel.matches.map((m, i) => (
          <ManualRow key={m.type} duel={duel} index={i} />
        ))}
      </div>
    </div>
  );
}

function ManualRow({ duel, index }: { duel: Duel; index: number }) {
  const m = duel.matches[index];
  const set = (a: number, b: number) => dispatch({ type: "setScore", duelId: duel.id, matchIndex: index, a, b });
  return (
    <>
      <span className="font-cond font-bold uppercase text-brand">{t.matchTypes[m.type]}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="field text-center text-xl"
        value={m.score.a}
        onChange={(e) => set(Number(e.target.value), m.score.b)}
      />
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="field text-center text-xl"
        value={m.score.b}
        onChange={(e) => set(m.score.a, Number(e.target.value))}
      />
    </>
  );
}
