/** Local calendar date as YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null || Number.isNaN(mins)) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function elapsedMinutes(isoStart: string): number {
  const start = new Date(isoStart).getTime();
  return Math.max(0, (Date.now() - start) / 60000);
}

export function computeStreak(streakDates: string[]): number {
  if (!streakDates.length) return 0;
  const set = new Set(streakDates);
  let streak = 0;
  const cursor = new Date();
  // If today has no activity, allow streak to count from yesterday
  if (!set.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
