import { useRef, useState } from "react";
import { downloadFile, timestamp } from "../download";
import { t } from "../i18n/texts";
import { parseState, serializeBackup } from "../model/persistence";
import { groupMembers, lineupValid } from "../model/tournament";
import { GROUPS, Settings, Team, TournamentState } from "../model/types";
import { dispatch, useTournament } from "../store/store";

export default function SetupPage() {
  const state = useTournament();
  const groupsOk = GROUPS.every((g) => groupMembers(state.teams, g).length === 4);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4">
          <h2 className="headline text-3xl">{t.setup.teams}</h2>
          <span className="subline text-sm">✓ {t.setup.saved}</span>
        </div>
        {!groupsOk && (
          <p className="mb-3 rounded-lg bg-red-700/60 px-3 py-2 font-semibold">⚠ {t.setup.groupSizeWarning}</p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {state.teams.map((team) => (
            <TeamEditor key={team.id} team={team} />
          ))}
        </div>
        <p className="mt-2 text-xs text-white/60">{t.setup.groupLocked}</p>
      </section>

      <BackupSection state={state} />
      <SettingsSection settings={state.settings} />
      <ResetSection />
    </div>
  );
}

function TeamEditor({ team }: { team: Team }) {
  const valid = lineupValid(team);
  return (
    <div className={`card flex flex-col gap-2 p-3 ${valid ? "" : "ring-2 ring-accent"}`}>
      <div className="flex items-center gap-2">
        <span className="headline text-2xl">#{team.id}</span>
        <div className="ml-auto flex overflow-hidden rounded-lg ring-1 ring-white/20">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => dispatch({ type: "setTeamGroup", teamId: team.id, group: g })}
              className={`min-h-[40px] px-3 font-cond font-bold uppercase ${
                team.group === g ? "bg-brand text-navy" : "bg-transparent text-white"
              }`}
            >
              {t.group(g)}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="label">{t.setup.teamName}</span>
        <input
          className="field font-cond text-xl font-bold uppercase"
          value={team.name}
          onChange={(e) => dispatch({ type: "setTeamName", teamId: team.id, name: e.target.value })}
        />
      </label>
      {team.players.map((p, i) => (
        <div key={p.id} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="label">{t.setup.player(i + 1)}</span>
            <input
              className="field"
              value={p.name}
              onChange={(e) => dispatch({ type: "setPlayer", teamId: team.id, playerId: p.id, name: e.target.value })}
            />
          </label>
          <div className="flex overflow-hidden rounded-lg ring-1 ring-white/20">
            {(["F", "M"] as const).map((g) => (
              <button
                key={g}
                title={g === "F" ? t.setup.womanLong : t.setup.manLong}
                onClick={() => dispatch({ type: "setPlayer", teamId: team.id, playerId: p.id, gender: g })}
                className={`h-[42px] w-11 font-cond text-lg font-bold ${
                  p.gender === g ? (g === "F" ? "bg-accent text-navy" : "bg-brand text-navy") : "text-white/70"
                }`}
              >
                {g === "F" ? t.setup.woman : t.setup.man}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!valid && <p className="text-sm text-accent">⚠ {t.setup.lineupWarning}</p>}
    </div>
  );
}

function SettingsSection({ settings }: { settings: Settings }) {
  const update = (s: Partial<Settings>) => dispatch({ type: "updateSettings", settings: s });
  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="headline text-3xl">{t.setup.settings}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label>
          <span className="label">{t.setup.eventTitle}</span>
          <input className="field" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
        </label>
        <label>
          <span className="label">{t.setup.eventSubtitle}</span>
          <input className="field" value={settings.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
        </label>
        <label>
          <span className="label">{t.setup.eventDate}</span>
          <input className="field" value={settings.date} onChange={(e) => update({ date: e.target.value })} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <span className="label">{t.setup.courts}</span>
          <div className="grid grid-cols-4 gap-2">
            {settings.courts.map((c, i) => (
              <input
                key={i}
                type="number"
                inputMode="numeric"
                min={0}
                className="field text-center text-xl"
                value={c}
                onChange={(e) => {
                  const courts = [...settings.courts];
                  courts[i] = Number(e.target.value);
                  update({ courts });
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t.setup.matchMinutes}</span>
          <div className="grid grid-cols-3 gap-2">
            {settings.matchMinutes.map((m, i) => (
              <label key={i} className="flex items-center gap-2">
                <span className="whitespace-nowrap text-sm">{t.round(i + 1)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="field text-center text-xl"
                  value={m}
                  onChange={(e) => {
                    const matchMinutes = [...settings.matchMinutes] as Settings["matchMinutes"];
                    matchMinutes[i] = Math.max(1, Number(e.target.value) || 1);
                    update({ matchMinutes });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div>
        <span className="label">{t.setup.schedule}</span>
        <div className="flex flex-col gap-2">
          {settings.schedule.map((item, i) => {
            const set = (patch: Partial<typeof item>) =>
              update({ schedule: settings.schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
            return (
              <div key={i} className="grid grid-cols-[5rem_5rem_1fr_auto] gap-2">
                <input className="field" aria-label={t.setup.from} value={item.from} onChange={(e) => set({ from: e.target.value })} />
                <input className="field" aria-label={t.setup.to} value={item.to} onChange={(e) => set({ to: e.target.value })} />
                <input className="field" aria-label={t.setup.label} value={item.label} onChange={(e) => set({ label: e.target.value })} />
                <button
                  className="btn-secondary px-3"
                  aria-label={t.setup.remove}
                  onClick={() => update({ schedule: settings.schedule.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            className="btn-secondary self-start"
            onClick={() => update({ schedule: [...settings.schedule, { from: "", to: "", label: "" }] })}
          >
            + {t.setup.addScheduleItem}
          </button>
        </div>
      </div>
    </section>
  );
}

function BackupSection({ state }: { state: TournamentState }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<TournamentState | null>(null);

  const onFile = async (file: File) => {
    try {
      setPending(parseState(await file.text()));
      setMsg(null);
    } catch {
      setPending(null);
      setMsg({ ok: false, text: t.setup.importError });
    }
  };

  return (
    <section className="card flex flex-col gap-3 p-4 ring-2 ring-accent">
      <h2 className="headline text-3xl">{t.setup.backup}</h2>
      <p className="text-white/80">{t.setup.backupHint}</p>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary"
          onClick={() =>
            downloadFile(`team-challenge-backup_${timestamp()}.json`, serializeBackup(state), "application/json")
          }
        >
          ⬇ {t.setup.exportJson}
        </button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
          ⬆ {t.setup.importJson}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {pending && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-navy/60 p-3 ring-2 ring-accent">
          <p className="mr-auto font-semibold">{t.setup.importConfirm}</p>
          <button className="btn-secondary" onClick={() => setPending(null)}>
            {t.cancel}
          </button>
          <button
            className="btn-accent"
            onClick={() => {
              dispatch({ type: "import", state: pending });
              setPending(null);
              setMsg({ ok: true, text: t.setup.importOk });
            }}
          >
            {t.setup.importJson}
          </button>
        </div>
      )}
      {msg && (
        <p className={`rounded-lg px-3 py-2 font-semibold ${msg.ok ? "bg-emerald-700/60" : "bg-red-700/70"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}

function ResetSection() {
  const [word, setWord] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="card flex flex-col gap-3 p-4 ring-2 ring-red-500/70">
      <h2 className="font-cond text-3xl font-extrabold uppercase text-red-400">{t.setup.danger}</h2>
      <p className="text-white/80">{t.setup.resetHint(t.setup.resetWord)}</p>
      <div className="flex flex-wrap gap-2">
        <input
          className="field max-w-xs font-mono uppercase"
          value={word}
          placeholder={t.setup.resetWord}
          onChange={(e) => {
            setWord(e.target.value);
            setDone(false);
          }}
        />
        <button
          className="btn-danger"
          disabled={word.trim().toUpperCase() !== t.setup.resetWord}
          onClick={() => {
            dispatch({ type: "reset" });
            setWord("");
            setDone(true);
          }}
        >
          {t.setup.reset}
        </button>
      </div>
      {done && <p className="text-sm text-accent">{t.setup.resetDone}</p>}
    </section>
  );
}
