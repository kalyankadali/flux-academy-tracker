type Props = {
  days: number;
}

/** Quiet day-count ring; a reminder, not a score. */
export function StreakRing({ days }: Props) {
  const safeDays = Math.max(0, Math.round(days));

  return (
    <div className="flex items-center gap-2" title={`${safeDays} day streak`}>
      <span
        aria-label={`${safeDays} day streak`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-300/70 text-[11px] font-medium tabular-nums text-stone-500 dark:border-stone-600 dark:text-stone-400"
      >
        {safeDays}
      </span>
      <span className="text-[11px] text-stone-400 dark:text-stone-500">day streak</span>
    </div>
  );
}
