import QrCode, { appUrl } from "../components/QrCode";
import { Icon, PageTitle, stagger } from "../components/ui";
import { navigate } from "../router";
import { currentFormat } from "../formats";
import { t } from "../i18n/texts";
import { useTournament } from "../store/store";

/**
 * How this tournament is played, written from the live settings so it always
 * matches what is actually set up. Players reach it from the QR on the TV.
 */
export default function RulesPage() {
  const state = useTournament();
  const format = currentFormat();
  const sections = format.rules(state);
  const url = appUrl();

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={format.name} subtitle={format.tagline}>
        <button className="btn-gray" onClick={() => navigate("poster")}>
          <Icon name="download" className="h-[18px] w-[18px]" />
          {t.poster.open}
        </button>
      </PageTitle>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => (
            <section key={s.id} className="card anim-rise flex flex-col gap-2 p-4 sm:p-5" style={stagger(i, 50)}>
              <h2 className="text-[20px] font-bold tracking-tight sm:text-[22px]">{s.title}</h2>
              {s.lead && <p className="text-[16px] text-ink2">{s.lead}</p>}
              {s.points && (
                <ul className="flex flex-col gap-1.5 pt-0.5">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex gap-2.5 text-[16px]">
                      <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-tint" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-yellow text-navy">
                <Icon name="chart" className="h-[18px] w-[18px]" />
              </span>
              <h2 className="text-[17px] font-bold">{t.rules.schedule}</h2>
            </div>
            <ul className="flex flex-col gap-1">
              {state.settings.schedule.map((item) => (
                <li key={`${item.from}-${item.label}`} className="flex items-baseline gap-3 text-[15px]">
                  <span className="num w-[92px] shrink-0 text-ink2">
                    {item.from}–{item.to}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {url && (
            <section className="card flex flex-col items-center gap-2 p-4 sm:p-5">
              <h2 className="text-[17px] font-bold">{t.rules.shareTitle}</h2>
              <QrCode text={url} className="w-[180px]" />
              <p className="text-center text-[14px] text-ink2">{t.rules.shareHint}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
