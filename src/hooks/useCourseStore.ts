import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCourseById } from '../data/courses';
import type { AppState, CourseData, Lesson, WinEntry } from '../types';
import { todayKey, todayKeyKolkata, computeStreak } from '../utils/dates';
import { isLessonComplete, overallProgress, findNextIncompleteLesson } from '../utils/progress';
import { celebrate } from '../utils/celebrate';
import { loadCourseState, saveCourseState } from '../utils/storage';
import { loadPrefs, savePrefs } from '../utils/prefs';
import { recordFinish } from '../utils/streak';
import type { DailyStreakState, MainShare } from '../types';

function syncLessonCompletion(lesson: Lesson): boolean {
  const complete = isLessonComplete(lesson);
  const was = lesson.completed;
  lesson.completed = complete;
  return !was && complete;
}

const EMPTY_COURSE: CourseData = {
  id: '',
  title: '',
  url: '',
  modules: [],
  comingSoon: true,
};

export type Toast = { id: string; message: string; tone: 'soft' | 'win' };

export type FirstWinOpts = {
  lastFirstWinDayISO: string | null;
  onFirstWinOfDay: (dayISO: string) => void;
  /** Fired when a lesson flips to complete (calm daily streak). */
  onLessonFinish?: (patch: { dailyStreak: DailyStreakState; mainShare: MainShare | null }) => void;
};

export function useCourseStore(courseId: string, firstWin?: FirstWinOpts) {
  const course = useMemo(() => getCourseById(courseId) ?? EMPTY_COURSE, [courseId]);

  const [state, setState] = useState<AppState>(() =>
    loadCourseState(courseId, course.modules),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!courseId) return;
    saveCourseState(courseId, state);
  }, [courseId, state]);

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'win') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const stats = useMemo(() => overallProgress(state.modules), [state.modules]);
  const streak = useMemo(() => computeStreak(state.streakDates), [state.streakDates]);
  const next = useMemo(() => findNextIncompleteLesson(state.modules), [state.modules]);

  const todayWins = useMemo(() => {
    const key = todayKey();
    return state.wins.filter((w) => todayKey(new Date(w.completedAt)) === key);
  }, [state.wins]);

  const recordWin = (wins: WinEntry[], entry: Omit<WinEntry, 'id' | 'completedAt'>): WinEntry[] => {
    const win: WinEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      completedAt: new Date().toISOString(),
    };
    return [win, ...wins].slice(0, 100);
  };

  const markStreakDay = (dates: string[]): string[] => {
    const key = todayKey();
    if (dates.includes(key)) return dates;
    return [...dates, key];
  };

  const toggleSubtask = useCallback(
    (moduleId: string, lessonId: string, subtaskId: string) => {
      setState((prev) => {
        const modules = structuredClone(prev.modules);
        const mod = modules.find((m) => m.id === moduleId);
        if (!mod) return prev;
        const lesson = mod.lessons.find((l) => l.id === lessonId);
        if (!lesson) return prev;
        const sub = lesson.subtasks.find((s) => s.id === subtaskId);
        if (!sub) return prev;

        const becomingComplete = !sub.completed;
        sub.completed = becomingComplete;
        if (becomingComplete) {
          if (sub.timerStartedAt) {
            const elapsed = Math.max(
              1,
              Math.round((Date.now() - new Date(sub.timerStartedAt).getTime()) / 60000),
            );
            sub.actualMinutes = sub.actualMinutes ?? elapsed;
            sub.timerStartedAt = null;
          } else if (sub.actualMinutes == null) {
            sub.actualMinutes = sub.estimatedMinutes;
          }
        }

        let wins = prev.wins;
        let streakDates = prev.streakDates;

        if (becomingComplete) {
          streakDates = markStreakDay(streakDates);
          wins = recordWin(wins, { label: sub.label, type: 'subtask' });
          const dayIST = todayKeyKolkata();
          const prefsSnap = loadPrefs();
          const isFirstWin = prefsSnap.lastFirstWinDayISO !== dayIST;
          if (isFirstWin) {
            savePrefs({ ...prefsSnap, lastFirstWinDayISO: dayIST });
          }
          queueMicrotask(() => {
            celebrate('subtask');
            if (isFirstWin) {
              firstWin?.onFirstWinOfDay(dayIST);
              pushToast('Nice — first win today. That’s enough momentum.', 'soft');
            } else {
              pushToast(`Nice — “${sub.label}” checked off.`, 'win');
            }
          });
        }

        const lessonJustDone = syncLessonCompletion(lesson);
        if (lessonJustDone) {
          wins = recordWin(wins, { label: lesson.title, type: 'lesson' });
          queueMicrotask(() => {
            try {
              const prefsSnap = loadPrefs();
              const { state } = recordFinish(prefsSnap.dailyStreak);
              const key = `${courseId}::${moduleId}::${lessonId}`;
              let mainShare = prefsSnap.mainShare;
              if (mainShare && mainShare.lessonKey === key && !mainShare.done) {
                mainShare = { ...mainShare, done: true };
              }
              const next = { ...prefsSnap, dailyStreak: state, mainShare };
              savePrefs(next);
              firstWin?.onLessonFinish?.({ dailyStreak: state, mainShare });
            } catch {
              /* streak persist is best-effort */
            }
            celebrate('lesson');
            pushToast(`Lesson complete: ${lesson.title}. Beautiful.`, 'win');
          });
        }

        const allLessonsDone = mod.lessons.every((l) => isLessonComplete(l));
        const wasModuleDone = prev.modules
          .find((m) => m.id === moduleId)
          ?.lessons.every((l) => isLessonComplete(l));
        if (allLessonsDone && !wasModuleDone) {
          wins = recordWin(wins, { label: `Module ${mod.number}: ${mod.title}`, type: 'module' });
          queueMicrotask(() => {
            celebrate('module');
            pushToast(`Module ${mod.number} wrapped — that took heart.`, 'win');
          });
        }

        return { ...prev, modules, wins, streakDates };
      });
    },
    [pushToast, firstWin, courseId],
  );

  const startTimer = useCallback((moduleId: string, lessonId: string, subtaskId: string) => {
    setState((prev) => {
      const modules = structuredClone(prev.modules);
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subtasks.find((s) => s.id === subtaskId);
      if (!sub || sub.timerStartedAt) return prev;
      sub.timerStartedAt = new Date().toISOString();
      return { ...prev, modules };
    });
  }, []);

  const stopTimer = useCallback((moduleId: string, lessonId: string, subtaskId: string) => {
    setState((prev) => {
      const modules = structuredClone(prev.modules);
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subtasks.find((s) => s.id === subtaskId);
      if (!sub?.timerStartedAt) return prev;
      const elapsed = Math.max(
        1,
        Math.round((Date.now() - new Date(sub.timerStartedAt).getTime()) / 60000),
      );
      sub.actualMinutes = (sub.actualMinutes ?? 0) + elapsed;
      sub.timerStartedAt = null;
      return { ...prev, modules };
    });
  }, []);

  const setActualMinutes = useCallback(
    (moduleId: string, lessonId: string, subtaskId: string, minutes: number | null) => {
      setState((prev) => {
        const modules = structuredClone(prev.modules);
        const sub = modules
          .find((m) => m.id === moduleId)
          ?.lessons.find((l) => l.id === lessonId)
          ?.subtasks.find((s) => s.id === subtaskId);
        if (!sub) return prev;
        sub.actualMinutes = minutes;
        return { ...prev, modules };
      });
    },
    [],
  );

  const setHideCompleted = useCallback((hide: boolean) => {
    setState((prev) => ({ ...prev, hideCompleted: hide }));
  }, []);

  const resetProgress = useCallback(() => {
    setState({
      modules: structuredClone(course.modules),
      streakDates: [],
      wins: [],
      hideCompleted: false,
    });
    pushToast('Fresh start — no pressure, just possibility.', 'soft');
  }, [course.modules, pushToast]);

  return {
    course,
    courseTitle: course.title,
    courseUrl: course.url,
    comingSoon: !!course.comingSoon || course.modules.length === 0,
    modules: state.modules,
    hideCompleted: state.hideCompleted,
    stats,
    streak,
    next,
    todayWins,
    toasts,
    dismissToast,
    toggleSubtask,
    startTimer,
    stopTimer,
    setActualMinutes,
    setHideCompleted,
    resetProgress,
    pushToast,
  };
}
