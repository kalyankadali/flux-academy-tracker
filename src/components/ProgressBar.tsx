interface Props {
  pct: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ProgressBar({ pct, size = 'md', label }: Props) {
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2.5';
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>{label}</span>
          <span className="font-medium text-orange-600 dark:text-orange-300">{clamped}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800 ${h}`}>
        <div
          className={`${h} rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-amber-400 transition-all duration-500 ease-out dark:from-orange-500 dark:via-orange-400 dark:to-amber-300`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
