interface Props {
  onDismiss: () => void;
}

export function IpadTip({ onDismiss }: Props) {
  return (
    <div className="rounded-3xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">Tip · iPad home screen</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            On iPad: Share → Add to Home Screen for a calm standalone feel. Opens to Today when you have a plan.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl px-3 py-1.5 text-xs font-medium text-stone-500 ring-1 ring-stone-200 dark:ring-stone-600"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
