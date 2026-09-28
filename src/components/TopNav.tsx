import type { TopTab } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  tab: TopTab;
  onTab: (t: TopTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  hidden?: boolean;
}

const TABS: { id: TopTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sync', label: 'Sync' },
];

export function TopNav({ tab, onTab, theme, onToggleTheme, hidden }: Props) {
  if (hidden) {
    return (
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Focus mode
        </p>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    );
  }

  return (
    <nav className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* min-w-0 + hidden scrollbar so Sync stays reachable on ~390px phones */}
      <div className="min-w-0 w-full sm:w-auto sm:max-w-[calc(100%-6.5rem)]">
        <div
          className="flex max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-stone-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:bg-stone-900/70 dark:ring-stone-800"
          role="tablist"
          aria-label="Main"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTab(t.id)}
              className={`shrink-0 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition sm:px-3 sm:text-sm ${
                tab === t.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-orange-50 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="shrink-0 self-end sm:self-auto">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </nav>
  );
}
