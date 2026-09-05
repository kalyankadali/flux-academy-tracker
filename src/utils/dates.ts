/** Local calendar date as YYYY-MM-DD (device local) */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar date in Asia/Kolkata as YYYY-MM-DD */
export function todayKeyKolkata(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Kolkata calendar Y/M/D as numbers */
function kolkataYmd(d = new Date()): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), day: get('day') };
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayKey(dt);
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

/** ISO week key like 2026-W36 — computed from Asia/Kolkata calendar date */
export function isoWeekKey(d = new Date()): string {
  const { y, m, day } = kolkataYmd(d);
  const date = new Date(Date.UTC(y, m - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Sunday in Asia/Kolkata */
export function isSunday(d = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(d);
  return weekday === 'Sun';
}

export function daysBetweenISO(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

/** Ecommerce AI Sprint live cohort — keep 40-day plan clear these days. */
export const ECOMMERCE_FOCUS_CLEAR_START = '2026-09-14';
export const ECOMMERCE_FOCUS_CLEAR_END = '2026-09-18';

export function isEcommerceFocusClearDay(iso: string): boolean {
  return iso >= ECOMMERCE_FOCUS_CLEAR_START && iso <= ECOMMERCE_FOCUS_CLEAR_END;
}

/** Next calendar day that is not an Ecommerce focus-clear day (inclusive of `fromISO`). */
export function nextSchedulableDayISO(fromISO: string, maxSteps = 60): string {
  let d = fromISO;
  for (let i = 0; i < maxSteps; i++) {
    if (!isEcommerceFocusClearDay(d)) return d;
    d = addDaysISO(d, 1);
  }
  return fromISO;
}
