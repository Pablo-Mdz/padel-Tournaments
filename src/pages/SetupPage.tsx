import { ReactNode, useRef, useState } from "react";
import { Icon, Notice, PageTitle, Segmented, stagger } from "../components/ui";
import { downloadFile, timestamp } from "../download";
import { t } from "../i18n/texts";
import { parseState, serializeBackup } from "../model/persistence";
import { groupMembers, lineupValid } from "../model/tournament";
import { GROUPS, Gender, GroupId, Settings, Team, TournamentState } from "../model/types";
import { dispatch, useTournament } from "../store/store";

export default function SetupPage() {
  const state = useTournament();
  const groupsOk = GROUPS.every((g) => groupMembers(state.teams, g).length === 4);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={t.setup.title}
        subtitle={
          <span className="inline-flex items-center gap-1.5 text-good">
            <Icon name="check" className="h-4 w-4" />
            {t.setup.saved}
          </span>
        }
      />

      <section className="flex flex-col gap-3">
        <SectionHeader title={t.setup.teams} note={t.setup.groupLocked} />
        {!groupsOk && <Notice tone="bad">{t.setup.groupSizeWarning}</Notice>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.teams.map((team, i) => (
            <TeamEditor key={team.id} team={team} index={i} />
          ))}
        </div>
      </section>

      <BackupSection state={state} />
      <SettingsSection settings={state.settings} />
      <ResetSection />
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
      <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
      {note && <span className="text-[13px] text-ink2">{note}</span>}
    </div>
  );
}

function TeamEditor({ team, index }: { team: Team; index: number }) {
  const valid = lineupValid(team);
  return (
    <div
      style={stagger(index, 40)}
      className={`card anim-rise flex flex-col gap-3 p-4 ${valid ? "" : "ring-2 ring-warn/60"}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-navy text-[17px] text-yellow">
          {team.id}
        </span>
        <Segmented<GroupId>
          label={t.setup.group}
          size="sm"
          className="ml-auto w-[150px]"
          value={team.group}
          onChange={(g) => dispatch({ type: "setTeamGroup", teamId: team.id, group: g })}
          options={GROUPS.map((g) => ({ value: g, label: t.group(g) }))}
        />
      </div>
      <label>
        <span className="label">{t.setup.teamName}</span>
        <input
          className="field text-[19px] font-semibold"
          value={team.name}
          onChange={(e) => dispatch({ type: "setTeamName", teamId: team.id, name: e.target.value })}
        />
      </label>
      <div className="flex flex-col gap-2">
        {team.players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <input
              className="field min-w-0 flex-1"
              aria-label={t.setup.player(i + 1)}
              placeholder={t.setup.player(i + 1)}
              value={p.name}
              onChange={(e) => dispatch({ type: "setPlayer", teamId: team.id, playerId: p.id, name: e.target.value })}
            />
            <Segmented<Gender>
              label={`${t.setup.player(i + 1)} – ${t.setup.womanLong} / ${t.setup.manLong}`}
              size="sm"
              className="w-[92px] shrink-0"
              value={p.gender}
              onChange={(g) => dispatch({ type: "setPlayer", teamId: team.id, playerId: p.id, gender: g })}
              options={[
                { value: "F", label: <span title={t.setup.womanLong}>{t.setup.woman}</span> },
                { value: "M", label: <span title={t.setup.manLong}>{t.setup.man}</span> },
              ]}
            />
          </div>
        ))}
      </div>
      {!valid && (
        <p className="flex items-start gap-1.5 text-[13px] font-medium text-warn">
          <Icon name="alert" className="mt-0.5 h-4 w-4" />
          {t.setup.lineupWarning}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function SettingsSection({ settings }: { settings: Settings }) {
  const update = (s: Partial<Settings>) => dispatch({ type: "updateSettings", settings: s });
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={t.setup.settings} />
      <div className="card flex flex-col gap-5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label={t.setup.eventTitle}>
            <input className="field" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
          </Field>
          <Field label={t.setup.eventSubtitle}>
            <input className="field" value={settings.subtitle} onChange={(e) => update({ subtitle: e.target.value })} />
          </Field>
          <Field label={t.setup.eventDate}>
            <input className="field" value={settings.date} onChange={(e) => update({ date: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <span className="label">{t.setup.courts}</span>
            <div className="grid grid-cols-4 gap-2">
              {settings.courts.map((c, i) => (
                <input
                  key={i}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={`${t.setup.courts} ${i + 1}`}
                  className="field num text-center text-[22px]"
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
                <label key={i} className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="field num text-center text-[22px]"
                    value={m}
                    onChange={(e) => {
                      const matchMinutes = [...settings.matchMinutes] as Settings["matchMinutes"];
                      matchMinutes[i] = Math.max(1, Number(e.target.value) || 1);
                      update({ matchMinutes });
                    }}
                  />
                  <span className="text-[12px] text-ink2">{t.round(i + 1)}</span>
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
                <div key={i} className="grid grid-cols-[4.5rem_4.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[6rem_6rem_1fr_auto]">
                  <input className="field num text-center" aria-label={t.setup.from} value={item.from} onChange={(e) => set({ from: e.target.value })} />
                  <input className="field num text-center" aria-label={t.setup.to} value={item.to} onChange={(e) => set({ to: e.target.value })} />
                  <input className="field" aria-label={t.setup.label} value={item.label} onChange={(e) => set({ label: e.target.value })} />
                  <button
                    className="icon-btn !text-bad"
                    aria-label={t.setup.remove}
                    onClick={() => update({ schedule: settings.schedule.filter((_, j) => j !== i) })}
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <button
              className="btn-plain self-start"
              onClick={() => update({ schedule: [...settings.schedule, { from: "", to: "", label: "" }] })}
            >
              <Icon name="plus" className="h-[18px] w-[18px]" />
              {t.setup.addScheduleItem}
            </button>
          </div>
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
    <section className="flex flex-col gap-3">
      <SectionHeader title={t.setup.backup} />
      <div className="card flex flex-col gap-4 p-4 sm:p-5">
        <p className="text-[15px] text-ink2">{t.setup.backupHint}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-tint"
            onClick={() =>
              downloadFile(`team-challenge-backup_${timestamp()}.json`, serializeBackup(state), "application/json")
            }
          >
            <Icon name="download" className="h-[18px] w-[18px]" />
            {t.setup.exportJson}
          </button>
          <button className="btn-gray" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" className="h-[18px] w-[18px]" />
            {t.setup.importJson}
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
          <Notice
            tone="warn"
            actions={
              <>
                <button className="btn-gray" onClick={() => setPending(null)}>
                  {t.cancel}
                </button>
                <button
                  className="btn-tint"
                  onClick={() => {
                    dispatch({ type: "import", state: pending });
                    setPending(null);
                    setMsg({ ok: true, text: t.setup.importOk });
                  }}
                >
                  {t.setup.importJson}
                </button>
              </>
            }
          >
            {t.setup.importConfirm}
          </Notice>
        )}
        {msg && <Notice tone={msg.ok ? "good" : "bad"}>{msg.text}</Notice>}
      </div>
    </section>
  );
}

function ResetSection() {
  const [word, setWord] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={t.setup.danger} />
      <div className="card flex flex-col gap-3 p-4 sm:p-5">
        <p className="text-[15px] text-ink2">{t.setup.resetHint(t.setup.resetWord)}</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="field max-w-xs font-mono uppercase"
            value={word}
            aria-label={t.setup.resetHint(t.setup.resetWord)}
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
        {done && <Notice tone="good">{t.setup.resetDone}</Notice>}
      </div>
    </section>
  );
}
