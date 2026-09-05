import { useCallback, useMemo } from 'react';
import type { AppPrefs } from '../types';
import { formatMinutes } from '../utils/dates';
import { collectWeekExport, focusClearRangeLabel } from '../utils/weekExport';

interface Props {
  schedule: AppPrefs['schedule'];
  /** Quieter placement copy when tucked under Upcoming header */
  compact?: boolean;
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_SHORT[(dt.getUTCDay() + 6) % 7]; // Mon=0
  const monthDay = dt.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
  return `${weekday} · ${monthDay}`;
}

/**
 * Calm secondary control: builds a light print sheet of this week's schedule
 * and opens the system print dialog (Save as PDF / Share → Print on iPad).
 */
export function WeekExportButton({ schedule, compact = false }: Props) {
  const data = useMemo(() => collectWeekExport(schedule), [schedule]);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof data.lessons>();
    for (const item of data.lessons) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data.lessons]);

  const onPrint = useCallback(() => {
    document.documentElement.classList.add('printing-week-export');
    const cleanup = () => {
      document.documentElement.classList.remove('printing-week-export');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(cleanup, 60_000);
    window.print();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={onPrint}
        className={
          compact
            ? 'rounded-xl px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 dark:text-stone-300 dark:ring-stone-600 dark:hover:bg-stone-800'
            : 'rounded-xl px-3 py-2 text-xs font-medium text-stone-600 ring-1 ring-stone-200 transition hover:bg-white dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800'
        }
        title="Opens print · Save as PDF for offline / iPad annotation"
      >
        Print this week
      </button>

      <div
        id="week-export-print-root"
        className="week-export-print-root"
        aria-hidden="true"
      >
        <div className="week-export-sheet">
          <header className="week-export-header">
            <h1 className="week-export-title">
              Flux Academy Tracker · Week of {data.weekOfLabel}
            </h1>
            <p className="week-export-sub">
              Mon–Sun · Asia/Kolkata
              {data.lessons.length > 0
                ? ` · ${data.lessons.length} lesson${data.lessons.length === 1 ? '' : 's'} · ~${formatMinutes(data.totalMinutes)}`
                : ''}
            </p>
          </header>

          {data.focusClearDaysInWeek.length > 0 && (
            <p className="week-export-note">
              Note: {focusClearRangeLabel()} are Ecommerce AI Sprint focus-clear days — path lessons
              stay light on purpose.
            </p>
          )}

          {byDate.length === 0 ? (
            <p className="week-export-empty">Nothing scheduled this week yet.</p>
          ) : (
            <div className="week-export-days">
              {byDate.map(([date, items]) => (
                <section key={date} className="week-export-day">
                  <h2 className="week-export-day-title">
                    {formatDayHeading(date)}
                    {items.some((i) => i.focusClear) ? (
                      <span className="week-export-badge"> sprint focus</span>
                    ) : null}
                  </h2>
                  <ul className="week-export-list">
                    {items.map((item) => (
                      <li key={item.key} className="week-export-row">
                        <div className="week-export-check" aria-hidden="true" />
                        <div className="week-export-body">
                          <p className="week-export-lesson">
                            {item.done ? (
                              <span className="week-export-done">{item.lessonTitle}</span>
                            ) : (
                              item.lessonTitle
                            )}
                          </p>
                          <p className="week-export-meta">
                            {item.courseTitle}
                            <span className="week-export-dot">·</span>
                            {item.label}
                          </p>
                        </div>
                        <div className="week-export-mins">{item.minutesLabel}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <footer className="week-export-footer">
            Soft sheet for offline notes · Save as PDF from print · No rush
          </footer>
        </div>
      </div>
    </>
  );
}
