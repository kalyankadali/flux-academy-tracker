interface TomorrowFirst {
  title: string;
  label: string;
}

interface Props {
  dayDone: boolean;
  showClose: boolean;
  todayWins: string[];
  tomorrowFirst: TomorrowFirst | null;
  sprintFocus: boolean;
  onMarkDayDone: () => void;
  onShowClose: () => void;
}

export function TodayCloseBlock({
  dayDone, showClose, todayWins, tomorrowFirst, sprintFocus, onMarkDayDone, onShowClose,
}: Props) {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Close today</h2>
      {dayDone ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Day marked done. Rest well.</p>
      ) : (
        <button type="button" onClick={() => { onMarkDayDone(); onShowClose(); }} className="mt-3 rounded-xl bg-stone-800 px-3 py-2 text-sm font-medium text-white dark:bg-stone-200 dark:text-stone-900">Mark day done</button>
      )}
      {showClose && (
        <div className="mt-3 space-y-2 rounded-2xl bg-orange-50/60 p-3 dark:bg-orange-950/30">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Today’s wins</p>
          {todayWins.length === 0 ? <p className="text-sm text-stone-500">Showing up counted. That’s enough.</p> : (
            <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">{todayWins.map((w) => <li key={w}>{w}</li>)}</ul>
          )}
          {tomorrowFirst && !sprintFocus && (
            <div className="mt-2 border-t border-orange-100 pt-2 dark:border-orange-900/40">
              <p className="text-xs text-stone-400">Tomorrow’s first lesson</p>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{tomorrowFirst.title}</p>
              <p className="text-xs text-stone-400">{tomorrowFirst.label}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
