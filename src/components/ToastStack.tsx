import type { Toast } from '../hooks/useCourseStore';

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-[fadeIn_0.25s_ease] ${
            t.tone === 'win'
              ? 'border-orange-100 bg-white/95 text-orange-950 dark:border-orange-900 dark:bg-stone-900/95 dark:text-orange-100'
              : 'border-amber-100 bg-amber-50/95 text-amber-950 dark:border-amber-900 dark:bg-stone-900/95 dark:text-amber-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg" aria-hidden>
              {t.tone === 'win' ? '✨' : '🌿'}
            </span>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-lg px-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-600 dark:hover:bg-stone-800"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
