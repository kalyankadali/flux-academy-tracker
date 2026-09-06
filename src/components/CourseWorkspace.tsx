import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './Dashboard';
import { ModuleList } from './ModuleList';
import { LessonDetail } from './LessonDetail';
import { ToastStack } from './ToastStack';
import { useCourseStore } from '../hooks/useCourseStore';
import { makeLessonKey } from '../utils/lessonKeys';
import type { AppPrefs, LessonKey, View } from '../types';
import { isLessonComplete } from '../utils/progress';

export const DEEP_LINK_KEY = 'flux-open-lesson';

function readDeepLink(courseId: string): View {
  try {
    const raw = sessionStorage.getItem(DEEP_LINK_KEY);
    if (!raw) return { type: 'dashboard' };
    const data = JSON.parse(raw) as { courseId: string; moduleId: string; lessonId: string };
    if (data.courseId !== courseId) return { type: 'dashboard' };
    sessionStorage.removeItem(DEEP_LINK_KEY);
    return { type: 'lesson', moduleId: data.moduleId, lessonId: data.lessonId };
  } catch {
    return { type: 'dashboard' };
  }
}

export function CourseWorkspace({
  courseId,
  onBackHome,
  prefs,
  onTickQueue,
  onRefreshQueue,
  onOpenQueueLesson,
  onPinLesson,
  onRecordUndo,
  onFirstWinOfDay,
  focusMode,
  onExitFocus,
}: {
  courseId: string;
  onBackHome: () => void;
  prefs: AppPrefs;
  onTickQueue: (key: LessonKey) => void;
  onRefreshQueue: () => void;
  onOpenQueueLesson: (courseId: string, moduleId: string, lessonId: string) => void;
  onPinLesson: (key: LessonKey | null) => void;
  onRecordUndo: (snap: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    subtaskId: string;
  }) => void;
  onFirstWinOfDay: (dayISO: string) => void;
  focusMode: boolean;
  onExitFocus: () => void;
}) {
  const store = useCourseStore(courseId, {
    lastFirstWinDayISO: prefs.lastFirstWinDayISO,
    onFirstWinOfDay,
  });
  const [view, setView] = useState<View>(() => readDeepLink(courseId));
  const [menuOpen, setMenuOpen] = useState(false);

  const active = useMemo(() => {
    if (view.type !== 'lesson') return null;
    const module = store.modules.find((m) => m.id === view.moduleId);
    const lesson = module?.lessons.find((l) => l.id === view.lessonId);
    if (!module || !lesson) return null;
    return { module, lesson };
  }, [view, store.modules]);

  const openLesson = (moduleId: string, lessonId: string) => {
    setView({ type: 'lesson', moduleId, lessonId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    for (const mod of store.modules) {
      for (const lesson of mod.lessons) {
        if (!isLessonComplete(lesson)) continue;
        const key = makeLessonKey(courseId, mod.id, lesson.id);
        if (prefs.queue.keys.includes(key) && !prefs.queue.completedKeys.includes(key)) {
          onTickQueue(key);
        }
      }
    }
  }, [store.modules, courseId, prefs.queue.keys, prefs.queue.completedKeys, onTickQueue]);

  const handleToggle = (moduleId: string, lessonId: string, subtaskId: string) => {
    const lesson = store.modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    const sub = lesson?.subtasks.find((s) => s.id === subtaskId);
    const becomingComplete = sub && !sub.completed;
    store.toggleSubtask(moduleId, lessonId, subtaskId);
    if (becomingComplete) {
      onRecordUndo({ courseId, moduleId, lessonId, subtaskId });
    }
  };

  return (
    <>
      {!focusMode && (
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackHome}
              className="rounded-2xl bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-700 shadow-sm ring-1 ring-orange-100 transition hover:bg-white dark:bg-stone-800/80 dark:text-orange-300 dark:ring-orange-900"
            >
              ← All courses
            </button>
            <button
              type="button"
              onClick={() => setView({ type: 'dashboard' })}
              className="rounded-2xl bg-white/60 px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-100 transition hover:bg-white dark:bg-stone-800/60 dark:text-stone-300 dark:ring-stone-700"
            >
              Dashboard
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-2xl bg-white/70 px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-100 dark:bg-stone-800/70 dark:text-stone-300 dark:ring-stone-700"
              aria-label="More actions"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-stone-100 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                {!store.comingSoon && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-xs text-stone-600 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={store.hideCompleted}
                      onChange={(e) => store.setHideCompleted(e.target.checked)}
                      className="rounded border-stone-300 text-orange-600 focus:ring-orange-300"
                    />
                    Hide completed
                  </label>
                )}
                {!store.comingSoon && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (
                        window.confirm(
                          'Reset progress for this course? This only clears local data on this device.',
                        )
                      ) {
                        store.resetProgress();
                        setView({ type: 'dashboard' });
                        onRefreshQueue();
                      }
                    }}
                    className="w-full rounded-xl px-2 py-2 text-left text-xs text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Reset progress
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      {focusMode && view.type === 'lesson' && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onExitFocus}
            className="rounded-2xl bg-white/80 px-3 py-1.5 text-sm font-medium text-orange-700 ring-1 ring-orange-100 dark:bg-stone-800/80 dark:text-orange-300 dark:ring-orange-900"
          >
            ← Exit focus · Today
          </button>
        </div>
      )}

      {store.comingSoon ? (
        <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm dark:border-amber-900/40 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Coming soon</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
            {store.courseTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-500 dark:text-stone-400">
            {courseId === 'ecommerce-ai-sprint'
              ? 'Live cohort Sep 14–18, 2026. Curriculum fills in closer to the sprint — your 40-day plan keeps those days clear.'
              : 'This course is listed so you can find it later.'}
          </p>
          <a
            href={store.courseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-sm text-orange-600 underline decoration-orange-200 underline-offset-2"
          >
            Open on Flux Academy
          </a>
        </div>
      ) : (
        <>
          {view.type === 'dashboard' && (
            <div className="space-y-10">
              <Dashboard
                courseId={courseId}
                courseTitle={store.courseTitle}
                courseUrl={store.courseUrl}
                stats={store.stats}
                streak={store.streak}
                next={store.next}
                todayWins={store.todayWins}
                queue={prefs.queue}
                onOpenLesson={openLesson}
                onOpenQueueLesson={(cId, mId, lId) => {
                  if (cId === courseId) openLesson(mId, lId);
                  else onOpenQueueLesson(cId, mId, lId);
                }}
                onTickQueue={onTickQueue}
              />
              <ModuleList
                modules={store.modules}
                hideCompleted={store.hideCompleted}
                onOpenLesson={openLesson}
              />
            </div>
          )}

          {view.type === 'lesson' && active && (
            <LessonDetail
              course={store.course}
              module={active.module}
              lesson={active.lesson}
              pinnedLessonKey={prefs.pinnedLessonKey}
              onPinLesson={onPinLesson}
              onBack={onExitFocus}
              deferPractice={prefs.deferPractice}
              onToggleSubtask={(subtaskId) =>
                handleToggle(active.module.id, active.lesson.id, subtaskId)
              }
              onStartTimer={(subtaskId) =>
                store.startTimer(active.module.id, active.lesson.id, subtaskId)
              }
              onStopTimer={(subtaskId) =>
                store.stopTimer(active.module.id, active.lesson.id, subtaskId)
              }
              onSetActual={(subtaskId, minutes) =>
                store.setActualMinutes(active.module.id, active.lesson.id, subtaskId, minutes)
              }
            />
          )}

          {view.type === 'lesson' && !active && (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm dark:bg-stone-900">
              <p className="text-stone-500">That lesson couldn’t be found.</p>
              <button
                type="button"
                onClick={() => setView({ type: 'dashboard' })}
                className="mt-3 text-sm text-orange-600 underline"
              >
                Back to dashboard
              </button>
            </div>
          )}
        </>
      )}

      <ToastStack toasts={store.toasts} onDismiss={store.dismissToast} />
    </>
  );
}
