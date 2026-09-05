import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppPrefs, LessonKey, ThemeMode } from '../types';
import { COURSES } from '../data/courses';
import {
  applyTheme,
  loadPrefs,
  savePrefs,
} from '../utils/prefs';
import { markQueueLessonDone, refreshQueueBatch } from '../utils/queue';

export function useAppPrefs() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs());

  useEffect(() => {
    applyTheme(prefs.theme);
    savePrefs(prefs);
  }, [prefs]);

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

  const tickQueueItem = useCallback((key: LessonKey) => {
    setPrefs((p) => {
      let queue = markQueueLessonDone(p.queue, key);
      // If all 3 done, roll to next batch
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

  const visibleHomeCourseIds = useMemo(() => {
    if (prefs.showAllCourses) return COURSES.map((c) => c.id);
    const ids: string[] = [];
    if (prefs.pinnedCourseId) ids.push(prefs.pinnedCourseId);
    for (const id of prefs.recentlyUsed) {
      if (!ids.includes(id)) ids.push(id);
    }
    // Fill from learning path / COURSES order
    for (const c of COURSES) {
      if (!ids.includes(c.id)) ids.push(c.id);
      if (ids.length >= 4) break;
    }
    return ids.slice(0, 4);
  }, [prefs.showAllCourses, prefs.pinnedCourseId, prefs.recentlyUsed]);

  return {
    prefs,
    setTheme,
    toggleTheme,
    pinCourse,
    touchRecent,
    setShowAllCourses,
    setScheduleDate,
    tickQueueItem,
    refreshQueue,
    replacePrefs,
    markSynced,
    visibleHomeCourseIds,
  };
}
