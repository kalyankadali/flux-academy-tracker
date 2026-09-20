import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppPrefs, LessonKey, ThemeMode, UndoSnapshot } from '../types';
import { COURSES } from '../data/courses';
import {
  applyTheme,
  loadPrefs,
  savePrefs,
} from '../utils/prefs';
import { markQueueLessonDone, refreshQueueBatch } from '../utils/queue';
import { compressCatchUp, generate40DayPlan } from '../utils/plan40';
import { todayKey, todayKeyKolkata, isoWeekKey, isEcommerceFocusClearDay, nextSchedulableDayISO, addDaysISO } from '../utils/dates';

export function useAppPrefs() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs());

  useEffect(() => {
    applyTheme(prefs.theme);
    savePrefs(prefs);
  }, [prefs]);

  /** One-shot: rebuild schedule from tomorrow through Oct 22 (user restart 2026-09-20). */
  useEffect(() => {
    const SEED = 'flux-plan-seed-2026-09-21';
    try {
      if (localStorage.getItem(SEED) === '1') return;
    } catch {
      return;
    }
    const startISO = addDaysISO(todayKeyKolkata(), 1);
    setPrefs((p) => {
      const protect = p.pinnedLessonKey ? new Set([p.pinnedLessonKey]) : new Set<LessonKey>();
      const { schedule, avgFullDayMinutes } = generate40DayPlan(COURSES, {
        startISO,
        protectKeys: protect,
      });
      if (p.pinnedLessonKey && p.schedule[p.pinnedLessonKey]) {
        const kept = p.schedule[p.pinnedLessonKey];
        schedule[p.pinnedLessonKey] =
          kept >= startISO && !isEcommerceFocusClearDay(kept)
            ? kept
            : nextSchedulableDayISO(startISO);
      }
      const dailyBudgetMinutes =
        avgFullDayMinutes > 0
          ? Math.min(300, Math.max(60, avgFullDayMinutes))
          : p.dailyBudgetMinutes;
      return {
        ...p,
        schedule,
        dailyBudgetMinutes,
        planGeneratedAt: new Date().toISOString(),
        catchUpCompressedUntil: null,
      };
    });
    try {
      localStorage.setItem(SEED, '1');
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  useEffect(() => {
    // Ensure queue is populated on first load
    setPrefs((p) => {
      const nextQueue = refreshQueueBatch(p.queue, COURSES, p.pinnedCourseId);
      if (
        nextQueue.keys.join() === p.queue.keys.join() &&
        nextQueue.completedKeys.join() === p.queue.completedKeys.join()
      ) {
        return p;
      }
      return { ...p, queue: nextQueue };
    });
  }, []);

  // Expire undo after ~30s
  useEffect(() => {
    if (!prefs.lastUndo) return;
    const ms = prefs.lastUndo.expiresAt - Date.now();
    if (ms <= 0) {
      setPrefs((p) => ({ ...p, lastUndo: null }));
      return;
    }
    const id = window.setTimeout(() => {
      setPrefs((p) => ({ ...p, lastUndo: null }));
    }, ms);
    return () => clearTimeout(id);
  }, [prefs.lastUndo]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPrefs((p) => ({ ...p, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const pinCourse = useCallback((courseId: string | null) => {
    setPrefs((p) => {
      const pinnedCourseId = p.pinnedCourseId === courseId ? null : courseId;
      const queue = refreshQueueBatch({ keys: [], completedKeys: [] }, COURSES, pinnedCourseId);
      return { ...p, pinnedCourseId, queue };
    });
  }, []);

  const pinLesson = useCallback((key: LessonKey | null) => {
    setPrefs((p) => ({
      ...p,
      pinnedLessonKey: p.pinnedLessonKey === key ? null : key,
    }));
  }, []);

  const touchRecent = useCallback((courseId: string) => {
    setPrefs((p) => {
      const recentlyUsed = [courseId, ...p.recentlyUsed.filter((id) => id !== courseId)].slice(0, 8);
      return { ...p, recentlyUsed };
    });
  }, []);

  const setShowAllCourses = useCallback((showAllCourses: boolean) => {
    setPrefs((p) => ({ ...p, showAllCourses }));
  }, []);

  const setScheduleDate = useCallback((lessonKey: LessonKey, date: string | null) => {
    setPrefs((p) => {
      const schedule = { ...p.schedule };
      if (!date) delete schedule[lessonKey];
      else schedule[lessonKey] = date;
      return { ...p, schedule };
    });
  }, []);

  const replaceSchedule = useCallback((schedule: Record<string, string>) => {
    setPrefs((p) => ({
      ...p,
      schedule,
      planGeneratedAt: new Date().toISOString(),
    }));
  }, []);

  const generatePlan = useCallback(() => {
    setPrefs((p) => {
      const protect = p.pinnedLessonKey ? new Set([p.pinnedLessonKey]) : new Set<LessonKey>();
      // Restart from tomorrow (IST) through PLAN_END — equal daily load, no soft "today" cap.
      const startISO = addDaysISO(todayKeyKolkata(), 1);
      const { schedule, avgFullDayMinutes } = generate40DayPlan(COURSES, {
        startISO,
        protectKeys: protect,
      });
      if (p.pinnedLessonKey && p.schedule[p.pinnedLessonKey]) {
        const kept = p.schedule[p.pinnedLessonKey];
        // If boss was pinned before tomorrow, move it onto the new window start
        schedule[p.pinnedLessonKey] =
          kept >= startISO && !isEcommerceFocusClearDay(kept)
            ? kept
            : nextSchedulableDayISO(startISO);
      }
      const dailyBudgetMinutes =
        avgFullDayMinutes > 0
          ? Math.min(300, Math.max(60, avgFullDayMinutes))
          : p.dailyBudgetMinutes;
      return {
        ...p,
        schedule,
        dailyBudgetMinutes,
        planGeneratedAt: new Date().toISOString(),
        catchUpCompressedUntil: null,
      };
    });
  }, []);

  const applyCatchUpCompress = useCallback(() => {
    setPrefs((p) => {
      const schedule = compressCatchUp(p.schedule, COURSES, {
        bossKey: p.pinnedLessonKey,
      });
      return {
        ...p,
        schedule,
        catchUpCompressedUntil: todayKey(),
      };
    });
  }, []);

  const tickQueueItem = useCallback((key: LessonKey) => {
    setPrefs((p) => {
      let queue = markQueueLessonDone(p.queue, key);
      if (queue.keys.length > 0 && queue.keys.every((k) => queue.completedKeys.includes(k))) {
        queue = refreshQueueBatch(queue, COURSES, p.pinnedCourseId);
      }
      return { ...p, queue };
    });
  }, []);

  const refreshQueue = useCallback(() => {
    setPrefs((p) => ({
      ...p,
      queue: refreshQueueBatch(p.queue, COURSES, p.pinnedCourseId),
    }));
  }, []);

  const replacePrefs = useCallback((next: AppPrefs) => {
    applyTheme(next.theme);
    setPrefs(next);
  }, []);

  const markSynced = useCallback((remoteBlobId?: string | null) => {
    setPrefs((p) => ({
      ...p,
      lastSyncAt: new Date().toISOString(),
      remoteBlobId: remoteBlobId !== undefined ? remoteBlobId : p.remoteBlobId,
    }));
  }, []);

  const markDayDone = useCallback((date = todayKey()) => {
    setPrefs((p) => ({
      ...p,
      dayDoneDates: p.dayDoneDates.includes(date) ? p.dayDoneDates : [...p.dayDoneDates, date],
    }));
  }, []);

  const setDeferPractice = useCallback((deferPractice: boolean) => {
    setPrefs((p) => ({ ...p, deferPractice }));
  }, []);

  const setFocusLessonMode = useCallback((focusLessonMode: boolean) => {
    setPrefs((p) => ({ ...p, focusLessonMode }));
  }, []);

  const setMorningPing = useCallback((morningPingEnabled: boolean) => {
    setPrefs((p) => ({ ...p, morningPingEnabled }));
  }, []);

  const setDailyBudget = useCallback((dailyBudgetMinutes: number) => {
    setPrefs((p) => ({
      ...p,
      dailyBudgetMinutes: Math.min(300, Math.max(60, dailyBudgetMinutes)),
    }));
  }, []);

  const recordUndo = useCallback((snap: Omit<UndoSnapshot, 'expiresAt'>) => {
    setPrefs((p) => ({
      ...p,
      lastUndo: { ...snap, expiresAt: Date.now() + 30_000 },
    }));
  }, []);

  const clearUndo = useCallback(() => {
    setPrefs((p) => ({ ...p, lastUndo: null }));
  }, []);

  const useStreakShield = useCallback((weekKey: string) => {
    setPrefs((p) => ({ ...p, streakShieldUsedWeek: weekKey }));
  }, []);

  const dismissWeeklyReview = useCallback(() => {
    setPrefs((p) => ({
      ...p,
      weeklyReviewDismissedWeek: isoWeekKey(),
      lastWeeklyReviewWeekKey: isoWeekKey(),
    }));
  }, []);

  const saveWeeklyFocusNote = useCallback((weeklyFocusNote: string) => {
    const note = weeklyFocusNote.trim().slice(0, 200) || null;
    setPrefs((p) => ({
      ...p,
      weeklyFocusNote: note,
      lastWeeklyReviewWeekKey: isoWeekKey(),
    }));
  }, []);

  const dismissTip = useCallback(() => {
    setPrefs((p) => ({ ...p, tipDismissed: true }));
  }, []);

  const markFirstWinDay = useCallback((day = todayKeyKolkata()) => {
    setPrefs((p) => {
      if (p.lastFirstWinDayISO === day) return p;
      return { ...p, lastFirstWinDayISO: day };
    });
  }, []);


  const patchPrefs = useCallback((partial: Partial<AppPrefs>) => {
    setPrefs((p) => ({ ...p, ...partial }));
  }, []);

  const hasPlan = Object.keys(prefs.schedule).length > 0;

  const visibleHomeCourseIds = useMemo(() => {
    // While pinned/plan-active: show fewer courses
    const limit = prefs.pinnedCourseId || hasPlan ? 2 : 4;
    if (prefs.showAllCourses) return COURSES.map((c) => c.id);
    const ids: string[] = [];
    if (prefs.pinnedCourseId) ids.push(prefs.pinnedCourseId);
    for (const id of prefs.recentlyUsed) {
      if (!ids.includes(id)) ids.push(id);
    }
    for (const c of COURSES) {
      if (!ids.includes(c.id)) ids.push(c.id);
      if (ids.length >= limit) break;
    }
    return ids.slice(0, limit);
  }, [prefs.showAllCourses, prefs.pinnedCourseId, prefs.recentlyUsed, hasPlan]);

  return {
    prefs,
    hasPlan,
    setTheme,
    toggleTheme,
    pinCourse,
    pinLesson,
    touchRecent,
    setShowAllCourses,
    setScheduleDate,
    replaceSchedule,
    generatePlan,
    applyCatchUpCompress,
    tickQueueItem,
    refreshQueue,
    replacePrefs,
    markSynced,
    markDayDone,
    setDeferPractice,
    setFocusLessonMode,
    setMorningPing,
    setDailyBudget,
    recordUndo,
    clearUndo,
    useStreakShield,
    dismissWeeklyReview,
    saveWeeklyFocusNote,
    dismissTip,
    markFirstWinDay,
    patchPrefs,
    visibleHomeCourseIds,
  };
}
