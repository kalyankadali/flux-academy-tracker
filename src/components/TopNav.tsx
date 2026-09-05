import type { TopTab } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  tab: TopTab;
  onTab: (t: TopTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const TABS: { id: TopTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sync', label: 'Sync' },
];

export function TopNav({ tab, onTab, theme, onToggleTheme }: Props) {
  return (
    <nav className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-stone-100 dark:bg-stone-900/70 dark:ring-stone-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-stone-600 hover:bg-orange-50 dark:text-stone-300 dark:hover:bg-stone-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </nav>
  );
}
