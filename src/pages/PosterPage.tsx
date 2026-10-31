import QrCode, { appUrl } from "../components/QrCode";
import { currentFormat } from "../formats";
import { t } from "../i18n/texts";
import { goBack } from "../router";
import { useTournament } from "../store/store";

/**
 * A4 poster for the wall, built from the tournament that is set up right now:
 * its title, date, schedule and rules. Printing it from the browser gives a PDF.
 */
export default function PosterPage() {
  const state = useTournament();
  const format = currentFormat();
  const sections = format.rules(state).filter((s) => s.poster);
  const { settings } = state;
  const url = appUrl();

  return (
    <div className="poster-screen">
      <div className="no-print mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 pt-5">
        <button className="btn-gray" onClick={() => goBack("rules")}>
          {t.poster.back}
        </button>
        <button className="btn-tint" onClick={() => window.print()}>
          {t.poster.print}
        </button>
        <span className="text-[14px] text-ink2">{t.poster.hint}</span>
      </div>

      <article className="poster-sheet">
        <header className="flex items-start gap-5 border-b-2 border-navy pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11pt] font-semibold uppercase tracking-[0.14em] text-navy/60">{format.name}</p>
            <h1 className="mt-1 text-[30pt] font-bold leading-[1.05] tracking-[-0.02em] text-navy">{settings.title}</h1>
            <p className="mt-1.5 text-[13pt] font-semibold text-navy/70">
              {settings.subtitle} · {settings.date}
            </p>
          </div>
          {url && (
            <div className="w-[30mm] shrink-0 text-center">
              <QrCode text={url} className="w-full" />
              <p className="mt-1 text-[8pt] font-semibold leading-tight text-navy/70">{t.poster.qr}</p>
            </div>
          )}
        </header>

        <div className="mt-4 columns-2 gap-6 [column-fill:_balance]">
          {sections.map((s) => (
            <section key={s.id} className="mb-5 break-inside-avoid">
              <h2 className="text-[15pt] font-bold leading-tight text-navy">{s.title}</h2>
              {s.lead && <p className="mt-1 text-[11.5pt] leading-snug text-ink">{s.lead}</p>}
              {s.points && (
                <ul className="mt-1 flex flex-col gap-1">
                  {s.points.map((point, j) => (
                    <li key={j} className="flex gap-2 text-[11.5pt] leading-snug">
                      <span aria-hidden className="mt-[6px] h-[3pt] w-[3pt] shrink-0 rounded-full bg-yellow-dot" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mb-5 break-inside-avoid">
            <h2 className="text-[15pt] font-bold leading-tight text-navy">{t.rules.schedule}</h2>
            <ul className="mt-1 flex flex-col gap-0.5">
              {settings.schedule.map((item) => (
                <li key={`${item.from}-${item.label}`} className="flex items-baseline gap-2 text-[11.5pt] leading-snug">
                  <span className="num w-[26mm] shrink-0 text-navy/70">
                    {item.from}–{item.to}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="mt-auto flex items-baseline justify-between gap-4 border-t border-navy/20 pt-2 text-[9pt]">
          <span className="font-semibold uppercase tracking-[0.12em] text-navy/70">{t.motto}</span>
          <span className="text-navy/50">
            {t.credit.by} {t.credit.name} · {t.credit.url.replace(/^https?:\/\//, "")}
          </span>
        </footer>
      </article>
    </div>
  );
}
