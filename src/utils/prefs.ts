import type { AppPrefs, QueueBatch, ThemeMode } from '../types';

export const PREFS_KEY = 'flux-course-tracker:prefs:v2';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyQueue(): QueueBatch {
  return { keys: [], completedKeys: [] };
}

export function defaultPrefs(): AppPrefs {
  return {
    version: 2,
    syncId: uuid(),
    theme: 'light',
    pinnedCourseId: 'figma-for-web-designers-2-0',
    pinnedLessonKey: null,
    recentlyUsed: [],
    showAllCourses: false,
    schedule: {},
    queue: emptyQueue(),
    lastSyncAt: null,
    remoteBlobId: null,
    dailyBudgetMinutes: 105,
    deferPractice: false,
    focusLessonMode: false,
    dayDoneDates: [],
    streakShieldUsedWeek: null,
    lastUndo: null,
    morningPingEnabled: false,
    planGeneratedAt: null,
    weeklyReviewDismissedWeek: null,
    catchUpCompressedUntil: null,
  };
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      const prefs = defaultPrefs();
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      return prefs;
    }
    const parsed = JSON.parse(raw) as Partial<AppPrefs>;
    const base = defaultPrefs();
    return {
      ...base,
      ...parsed,
      version: 2,
      syncId: parsed.syncId || base.syncId,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      pinnedCourseId: parsed.pinnedCourseId ?? base.pinnedCourseId,
      pinnedLessonKey: parsed.pinnedLessonKey ?? null,
      recentlyUsed: Array.isArray(parsed.recentlyUsed) ? parsed.recentlyUsed : [],
      showAllCourses: !!parsed.showAllCourses,
      schedule: parsed.schedule && typeof parsed.schedule === 'object' ? parsed.schedule : {},
      queue: parsed.queue?.keys
        ? {
            keys: parsed.queue.keys.slice(0, 3),
            completedKeys: parsed.queue.completedKeys ?? [],
          }
        : emptyQueue(),
      lastSyncAt: parsed.lastSyncAt ?? null,
      remoteBlobId: parsed.remoteBlobId ?? null,
      dailyBudgetMinutes:
        typeof parsed.dailyBudgetMinutes === 'number'
          ? Math.min(300, Math.max(60, parsed.dailyBudgetMinutes))
          : base.dailyBudgetMinutes,
      deferPractice: !!parsed.deferPractice,
      focusLessonMode: !!parsed.focusLessonMode,
      dayDoneDates: Array.isArray(parsed.dayDoneDates) ? parsed.dayDoneDates : [],
      streakShieldUsedWeek: parsed.streakShieldUsedWeek ?? null,
      lastUndo: parsed.lastUndo ?? null,
      morningPingEnabled: !!parsed.morningPingEnabled,
      planGeneratedAt: parsed.planGeneratedAt ?? null,
      weeklyReviewDismissedWeek: parsed.weeklyReviewDismissedWeek ?? null,
      catchUpCompressedUntil: parsed.catchUpCompressedUntil ?? null,
    };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
