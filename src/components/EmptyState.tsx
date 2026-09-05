interface Props {
  onStart: () => void;
}

export function EmptyState({ onStart }: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-orange-200/80 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/80 p-8 text-center shadow-sm dark:border-orange-900/50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl dark:bg-orange-950/50">
        🌱
      </div>
      <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100">Ready when you are</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        You’re at 0% — and that’s a peaceful place to begin. No catching up. Just the next small step
        when it feels good.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-orange-600"
      >
        Start gently with the first lesson
      </button>
    </div>
  );
}
