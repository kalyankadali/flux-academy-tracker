import { isoWeekKey, todayKey } from './dates';

/**
 * Streak shield: 1 free skip/miss per week if budget was met earlier in the week.
 * Returns whether we should treat yesterday's miss as shielded.
 */
export function canUseStreakShield(opts: {
  streakDates: string[];
  budgetMetDates: string[];
  shieldUsedWeek: string | null;
  today?: string;
}): { canShield: boolean; weekKey: string } {
  const today = opts.today ?? todayKey();
  const weekKey = isoWeekKey(new Date(today + 'T12:00:00'));
  if (opts.shieldUsedWeek === weekKey) {
    return { canShield: false, weekKey };
  }
  // Budget met earlier this week (any day before today in same week)
  const metEarlier = opts.budgetMetDates.some((d) => {
    if (d >= today) return false;
    return isoWeekKey(new Date(d + 'T12:00:00')) === weekKey;
  });
  return { canShield: metEarlier, weekKey };
}

/** Apply shield: inject yesterday into streak dates if missing. */
export function applyStreakShield(streakDates: string[], today = todayKey()): string[] {
  const y = new Date(today + 'T12:00:00');
  y.setDate(y.getDate() - 1);
  const yesterday = todayKey(y);
  if (streakDates.includes(yesterday)) return streakDates;
  return [...streakDates, yesterday];
}
