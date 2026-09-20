import type { StreakView } from '../utils/streak';

const DOT_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = {
  view: StreakView;
  onUseFreeze?: () => void;
  freezeHintDay?: string | null;
};

/**
 * Calm streak pill + Mon–Sun dots + optional double-finish badge + freeze affordance.
 */
export function StreakStrip({ view, onUseFreeze, freezeHintDay }: Props) {
  const label =
    view.current === 0
      ? 'Start a calm streak'
      : view.current === 1
        ? '1-day streak'
        : `${view.current}-day streak`;

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-4 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/25">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <span aria-hidden>✦</span>
            {label}
          </span>
          {view.doubleFinish && (
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-orange-700 dark:border-orange-800 dark:bg-stone-900/60 dark:text-orange-200">
              Double finish · nice pace
            </span>
          )}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          {view.freezesLeftThisWeek === 0
            ? 'Freezes used this week'
            : `${view.freezesLeftThisWeek} freeze${view.freezesLeftThisWeek === 1 ? '' : 's'} left`}
        </p>
      </div>

      <div className="mt-3 flex justify-between gap-1 px-0.5">
        {view.weekDots.map((dot, i) => (
          <div key={`${DOT_LABELS[i]}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-stone-400">{DOT_LABELS[i]}</span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                dot === 'done'
                  ? 'bg-orange-500'
                  : dot === 'freeze'
                    ? 'bg-sky-400'
                    : dot === 'today'
                      ? 'ring-2 ring-orange-300 bg-transparent dark:ring-orange-600'
                      : dot === 'miss'
                        ? 'bg-stone-200 dark:bg-stone-700'
                        : 'bg-stone-100 dark:bg-stone-800'
              }`}
              title={
                dot === 'done'
                  ? 'Lesson done'
                  : dot === 'freeze'
                    ? 'Freeze used'
                    : dot === 'today'
                      ? 'Today'
                      : dot === 'miss'
                        ? 'Open day'
                        : 'Upcoming'
              }
              aria-label={`${DOT_LABELS[i]}: ${dot}`}
            />
          </div>
        ))}
      </div>

      {onUseFreeze && freezeHintDay && view.freezesLeftThisWeek > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-orange-100/80 pt-3 dark:border-orange-900/40">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Soft day? A freeze keeps the streak gentle.
          </p>
          <button
            type="button"
            onClick={onUseFreeze}
            className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-stone-200 dark:text-stone-900"
          >
            Use a freeze
          </button>
        </div>
      )}
    </div>
  );
}

type WeeklyProps = {
  current: number;
  longest: number;
  compact?: boolean;
};

/** Sunday (or always-small) weekly strip — current + longest. */
export function StreakWeeklyStrip({ current, longest, compact }: WeeklyProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-100 bg-white/70 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50 ${
        compact ? '' : ''
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
        {compact ? 'Streak' : 'This week’s streak'}
      </p>
      <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">
        Current {current}
        <span className="mx-1.5 text-stone-300 dark:text-stone-600">·</span>
        Longest {longest}
      </p>
    </div>
  );
}
