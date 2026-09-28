import { useState } from 'react';
import { CT_TAGLINE, INSTALL_CHECKLIST_TITLE } from '../utils/calmCopy';

const KEY = 'ct-install-checklist';
const ITEMS = [
  { id: 'homescreen', label: 'Add to Home Screen (Chrome → Install / Add to Home Screen)' },
  { id: 'open-icon', label: 'Open Calm Tracker from the home-screen icon' },
  { id: 'google', label: 'Sign in with Google (same account on every device)' },
  { id: 'notifs', label: 'Enable notifications on this phone (Android spare)' },
  { id: 'plan', label: 'Generate / confirm 24-day calm plan' },
  { id: 'better-home', label: 'Pair with Better Home morning ritual' },
];

export function InstallChecklist({ onDismiss }: { onDismiss?: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const allDone = ITEMS.every((i) => done[i.id]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            {INSTALL_CHECKLIST_TITLE}
          </p>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">{CT_TAGLINE}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-xs text-stone-400 underline underline-offset-2"
          >
            {allDone ? 'Done' : 'Hide'}
          </button>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!done[item.id]}
                onChange={() => toggle(item.id)}
              />
              <span className={done[item.id] ? 'text-stone-400 line-through' : ''}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
