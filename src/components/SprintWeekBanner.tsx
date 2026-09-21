interface Props {
  href: string;
}

export function SprintWeekBanner({ href }: Props) {
  return (
    <div className="rounded-3xl border border-sky-100/90 bg-gradient-to-br from-sky-50/90 to-orange-50/40 p-5 shadow-sm dark:border-sky-900/40 dark:from-sky-950/40 dark:to-orange-950/20">
      <p className="text-xs font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300">
        Sprint week
      </p>
      <h2 className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-100">Ecommerce AI Sprint</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        Focus on the live sprint today — path lessons stay clear. Your tracker is still here if you need it; no guilt either way.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 sm:w-auto sm:px-6"
      >
        Open live sprint
      </a>
    </div>
  );
}
