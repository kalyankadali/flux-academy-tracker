interface Props {
  hasPlan: boolean;
  planGeneratedAt?: string | null;
  onGenerate: () => void;
}

/** First-time: primary CTA. After plan exists: calm status + tucked regenerate. */
export function PlanGenerateControl({ hasPlan, planGeneratedAt, onGenerate }: Props) {
  const regenerate = () => {
    if (
      !window.confirm(
        'This replaces your current 40-day dates. Boss-pinned lessons stay protected. Continue?',
      )
    ) {
      return;
    }
    onGenerate();
  };

  if (!hasPlan) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
      >
        Generate 40-day plan
      </button>
    );
  }

  return (
    <div className="flex min-w-[8.5rem] flex-col items-end gap-1 text-right">
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Plan on</span>
      {planGeneratedAt ? (
        <p className="text-[10px] leading-snug text-stone-400">
          {new Date(planGeneratedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      ) : null}
      <details className="mt-0.5">
        <summary className="cursor-pointer list-none text-xs text-stone-500 underline-offset-2 marker:content-none hover:underline dark:text-stone-400 [&::-webkit-details-marker]:hidden">
          Plan options
        </summary>
        <button
          type="button"
          onClick={regenerate}
          className="mt-2 rounded-xl px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-white dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          Regenerate plan…
        </button>
      </details>
    </div>
  );
}
