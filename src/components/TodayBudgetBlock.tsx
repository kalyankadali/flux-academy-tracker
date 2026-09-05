import type { AppPrefs } from '../types';
import { formatMinutes } from '../utils/dates';

interface Props {
  sprintFocus: boolean;
  logged: number;
  budget: number;
  bStatus: string;
  plannedMins: number;
  prefs: AppPrefs;
  onDeferPractice: (v: boolean) => void;
}

export function TodayBudgetBlock({
  sprintFocus, logged, budget, bStatus, plannedMins, prefs, onDeferPractice,
}: Props) {
  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-sm dark:bg-stone-900 dark:border-stone-800 ${sprintFocus ? 'border-stone-100 opacity-70' : 'border-stone-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{sprintFocus ? 'Soft budget (optional today)' : 'Today’s soft budget'}</h2>
        <span className="text-xs text-stone-400">{formatMinutes(logged)} / {formatMinutes(budget)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div className={`h-full rounded-full ${bStatus === 'met' || bStatus === 'over' ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, Math.round((logged / budget) * 100))}%` }} />
      </div>
      {(bStatus === 'met' || bStatus === 'over') && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Beautiful — budget met. Celebrate and stop. Rest is productive.</p>}
      {plannedMins > 0 && !sprintFocus && <p className="mt-1 text-xs text-stone-400">Scheduled today ~{formatMinutes(plannedMins)}</p>}
      {!sprintFocus && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <input type="checkbox" checked={prefs.deferPractice} onChange={(e) => onDeferPractice(e.target.checked)} className="rounded border-stone-300 text-orange-600" />
          Defer practice tasks (prep / watch first)
        </label>
      )}
    </div>
  );
}
