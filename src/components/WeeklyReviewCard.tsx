interface Props {
  lessonCount: number;
  subtaskCount: number;
  lessonLabels: string[];
  subtaskLabels: string[];
  streak: number;
  focusDraft: string;
  onFocusDraft: (v: string) => void;
  lastFocusNote: string | null;
  showLastFocus: boolean;
  onSkip: () => void;
  onSave: () => void;
}

export function WeeklyReviewCard({
  lessonCount,
  subtaskCount,
  lessonLabels,
  subtaskLabels,
  streak,
  focusDraft,
  onFocusDraft,
  lastFocusNote,
  showLastFocus,
  onSkip,
  onSave,
}: Props) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5 dark:border-orange-900/40 dark:bg-stone-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Sunday · gentle weekly review</h2>
        <button type="button" onClick={onSkip} className="text-xs text-stone-400 underline decoration-stone-300 underline-offset-2">
          Skip for now
        </button>
      </div>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        This week: <strong>{lessonCount}</strong> lesson{lessonCount === 1 ? '' : 's'}
        {subtaskCount > 0 && (
          <>
            {' '}
            · <strong>{subtaskCount}</strong> subtask{subtaskCount === 1 ? '' : 's'}
          </>
        )}
        . Streak: {streak} day{streak === 1 ? '' : 's'}.
      </p>
      {(lessonLabels.length > 0 || subtaskLabels.length > 0) && (
        <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-sm text-stone-600 dark:text-stone-300">
          {lessonLabels.map((w) => (
            <li key={`l-${w}`} className="truncate">
              ✓ {w}
            </li>
          ))}
          {subtaskLabels.map((w) => (
            <li key={`s-${w}`} className="truncate text-stone-500">
              · {w}
            </li>
          ))}
        </ul>
      )}
      {lessonCount === 0 && subtaskCount === 0 && (
        <p className="mt-2 text-sm text-stone-500">A quiet week still counts. Rest and noticing are progress too.</p>
      )}
      {showLastFocus && lastFocusNote && (
        <p className="mt-3 text-xs text-stone-400">
          Last focus note: <span className="text-stone-600 dark:text-stone-300">{lastFocusNote}</span>
        </p>
      )}
      <label className="mt-3 block text-xs font-medium text-stone-500 dark:text-stone-400">
        One next focus (optional)
        <input
          type="text"
          value={focusDraft}
          onChange={(e) => onFocusDraft(e.target.value)}
          placeholder="e.g. Finish Module 2 watch tasks"
          maxLength={200}
          className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
        />
      </label>
      <p className="mt-1 text-xs text-stone-400">No scores — just picking one gentle north star. Skipping is fine.</p>
      <button type="button" onClick={onSave} className="mt-3 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white">
        Save & done for this week
      </button>
    </div>
  );
}
