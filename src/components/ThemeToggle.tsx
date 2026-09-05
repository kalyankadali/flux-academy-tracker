interface Props {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-2xl bg-white/80 px-3 py-1.5 text-sm text-stone-600 shadow-sm ring-1 ring-stone-200 transition hover:bg-white dark:bg-stone-800/80 dark:text-stone-300 dark:ring-stone-700"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
