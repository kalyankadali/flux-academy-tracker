import { addDaysISO, todayKeyKolkata, weekBoundsKolkata, weekDayKeys } from './dates';

/** Calm daily streak — IST day keys, 2 freezes per Mon–Sun week. */
export type DailyStreakState = {
  /** Lesson finish counts keyed by Asia/Calcutta YYYY-MM-DD */
  finishesByDay: Record<string, number>;
  /** IST days where a freeze kept the streak */
  freezeDates: string[];
  current: number;
  longest: number;
  /** Last IST day when rollover ran */
  rolledThroughDay: string | null;
  /** Soft evening banner dismissed for this IST day */
  softBannerDismissedDay: string | null;
};

export type StreakView = {
  current: number;
  longest: number;
  finishesToday: number;
  freezesLeftThisWeek: number;
  /** Mon→Sun: 'done' | 'freeze' | 'miss' | 'today' | 'future' */
  weekDots: Array<'done' | 'freeze' | 'miss' | 'today' | 'future'>;
  doubleFinish: boolean;
  dayKey: string;
  weekKey: string;
};

export const FREEZES_PER_WEEK = 2;

export function defaultDailyStreak(): DailyStreakState {
  return {
    finishesByDay: {},
    freezeDates: [],
    current: 0,
    longest: 0,
    rolledThroughDay: null,
    softBannerDismissedDay: null,
  };
}

export function normalizeDailyStreak(raw: unknown): DailyStreakState {
  const base = defaultDailyStreak();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const finishesByDay: Record<string, number> = {};
  if (o.finishesByDay && typeof o.finishesByDay === 'object') {
    for (const [k, v] of Object.entries(o.finishesByDay as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : Number(v);
      if (k && Number.isFinite(n) && n > 0) finishesByDay[k] = Math.floor(n);
    }
  }
  const freezeDates = Array.isArray(o.freezeDates)
    ? o.freezeDates.filter((d): d is string => typeof d === 'string')
    : [];
  return {
    finishesByDay,
    freezeDates,
    current: typeof o.current === 'number' ? Math.max(0, Math.floor(o.current)) : 0,
    longest: typeof o.longest === 'number' ? Math.max(0, Math.floor(o.longest)) : 0,
    rolledThroughDay: typeof o.rolledThroughDay === 'string' ? o.rolledThroughDay : null,
    softBannerDismissedDay:
      typeof o.softBannerDismissedDay === 'string' ? o.softBannerDismissedDay : null,
  };
}

function covered(state: DailyStreakState, day: string): boolean {
  return (state.finishesByDay[day] ?? 0) >= 1 || state.freezeDates.includes(day);
}

function freezesUsedInWeek(state: DailyStreakState, monday: string, sunday: string): number {
  return state.freezeDates.filter((d) => d >= monday && d <= sunday).length;
}

export function freezesLeftThisWeek(state: DailyStreakState, day = todayKeyKolkata()): number {
  const { monday, sunday } = weekBoundsKolkata(new Date(day + 'T12:00:00'));
  return Math.max(0, FREEZES_PER_WEEK - freezesUsedInWeek(state, monday, sunday));
}

/** Consecutive covered days ending today, or yesterday if today not yet covered. */
export function computeCurrentStreak(state: DailyStreakState, today = todayKeyKolkata()): number {
  let cursor = today;
  if (!covered(state, cursor)) {
    cursor = addDaysISO(cursor, -1);
  }
  let streak = 0;
  // Cap walk to avoid infinite loops on bad data
  for (let i = 0; i < 400; i++) {
    if (!covered(state, cursor)) break;
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function recompute(state: DailyStreakState, today = todayKeyKolkata()): DailyStreakState {
  const current = computeCurrentStreak(state, today);
  return {
    ...state,
    current,
    longest: Math.max(state.longest, current),
  };
}

/**
 * Close gaps before today: for each missed day since last activity (or rolledThrough),
 * consume a freeze if available; otherwise the streak will break on recompute.
 * Auto-freeze only applies to yesterday when the app opens on a new day (Duolingo-soft).
 */
export function rollover(state: DailyStreakState, today = todayKeyKolkata()): DailyStreakState {
  if (state.rolledThroughDay === today) {
    return recompute(state, today);
  }

  let next: DailyStreakState = {
    ...state,
    finishesByDay: { ...state.finishesByDay },
    freezeDates: [...state.freezeDates],
  };

  const yesterday = addDaysISO(today, -1);
  // Soft auto-freeze yesterday if streak was alive and user had freezes left
  if (!covered(next, yesterday) && computeCurrentStreak(next, yesterday) > 0) {
    const left = freezesLeftThisWeek(next, today);
    if (left > 0) {
      next.freezeDates = [...next.freezeDates, yesterday];
    }
  }

  next.rolledThroughDay = today;
  return recompute(next, today);
}

export function recordFinish(
  state: DailyStreakState,
  today = todayKeyKolkata(),
): { state: DailyStreakState; firstOfDay: boolean; doubleFinish: boolean } {
  let next = rollover(state, today);
  const prevCount = next.finishesByDay[today] ?? 0;
  const finishesByDay = { ...next.finishesByDay, [today]: prevCount + 1 };
  next = recompute({ ...next, finishesByDay }, today);
  return {
    state: next,
    firstOfDay: prevCount === 0,
    doubleFinish: prevCount + 1 >= 2,
  };
}

/** Manually spend a freeze on a specific IST day (usually yesterday). */
export function maybeUseFreeze(
  state: DailyStreakState,
  day: string,
  today = todayKeyKolkata(),
): { state: DailyStreakState; used: boolean; reason?: string } {
  let next = rollover(state, today);
  if (covered(next, day)) {
    return { state: next, used: false, reason: 'That day is already covered.' };
  }
  if (day > today) {
    return { state: next, used: false, reason: 'Freezes are for past days.' };
  }
  if (freezesLeftThisWeek(next, today) <= 0) {
    return { state: next, used: false, reason: 'No freezes left this week.' };
  }
  next = recompute(
    { ...next, freezeDates: [...next.freezeDates, day] },
    today,
  );
  return { state: next, used: true };
}

export function dismissSoftBanner(state: DailyStreakState, today = todayKeyKolkata()): DailyStreakState {
  return { ...state, softBannerDismissedDay: today };
}

export function viewStreak(state: DailyStreakState, today = todayKeyKolkata()): StreakView {
  const rolled = state.rolledThroughDay === today ? state : rollover(state, today);
  const { monday, weekKey } = weekBoundsKolkata(new Date(today + 'T12:00:00'));
  const days = weekDayKeys(monday);
  const weekDots = days.map((d) => {
    if (d > today) return 'future' as const;
    if (d === today) {
      if ((rolled.finishesByDay[d] ?? 0) >= 1) return 'done' as const;
      if (rolled.freezeDates.includes(d)) return 'freeze' as const;
      return 'today' as const;
    }
    if ((rolled.finishesByDay[d] ?? 0) >= 1) return 'done' as const;
    if (rolled.freezeDates.includes(d)) return 'freeze' as const;
    return 'miss' as const;
  });
  const finishesToday = rolled.finishesByDay[today] ?? 0;
  return {
    current: rolled.current,
    longest: rolled.longest,
    finishesToday,
    freezesLeftThisWeek: freezesLeftThisWeek(rolled, today),
    weekDots,
    doubleFinish: finishesToday >= 2,
    dayKey: today,
    weekKey,
  };
}

/** Kolkata wall-clock hour (0–23). */
export function kolkataHour(d = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Calcutta',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
}

export function shouldShowSoftBanner(state: DailyStreakState, today = todayKeyKolkata(), now = new Date()): boolean {
  if (kolkataHour(now) < 20) return false;
  if ((state.finishesByDay[today] ?? 0) >= 1) return false;
  if (state.softBannerDismissedDay === today) return false;
  return true;
}
