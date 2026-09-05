import { useEffect, useMemo, useState } from 'react';
import { CoursePicker } from './components/CoursePicker';
import { Dashboard } from './components/Dashboard';
import { ModuleList } from './components/ModuleList';
import { LessonDetail } from './components/LessonDetail';
import { ToastStack } from './components/ToastStack';
import { TopNav } from './components/TopNav';
import { TodayView } from './components/TodayView';
import { UpcomingView } from './components/UpcomingView';
import { CalendarView } from './components/CalendarView';
import { SyncPanel } from './components/SyncPanel';
import { useCourseStore } from './hooks/useCourseStore';
import { useAppPrefs } from './hooks/useAppPrefs';
import { makeLessonKey } from './utils/lessonKeys';
import type { AppPrefs, LessonKey, TopTab, View } from './types';
import { isLessonComplete } from './utils/progress';

const DEEP_LINK_KEY = 'flux-open-lesson';

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

function CourseWorkspace({
  courseId,
  onBackHome,
  prefs,
  onTickQueue,
  onRefreshQueue,
  onOpenQueueLesson,
}: {
  courseId: string;
  onBackHome: () => void;
  prefs: AppPrefs;
  onTickQueue: (key: LessonKey) => void;
  onRefreshQueue: () => void;
  onOpenQueueLesson: (courseId: string, moduleId: string, lessonId: string) => void;
}) {
  const store = useCourseStore(courseId);
  const [view, setView] = useState<View>(() => readDeepLink(courseId));

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

  return (
    <>
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
        <div className="flex flex-wrap items-center gap-2">
          {!store.comingSoon && (
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-100 dark:bg-stone-800/70 dark:text-stone-300 dark:ring-stone-700">
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
              className="rounded-2xl px-3 py-1.5 text-xs text-stone-400 transition hover:bg-white hover:text-stone-600 dark:hover:bg-stone-800"
            >
              Reset
            </button>
          )}
        </div>
      </nav>

      {store.comingSoon ? (
        <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm dark:border-amber-900/40 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Coming soon</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-800 dark:text-stone-100">
            {store.courseTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-stone-500 dark:text-stone-400">
            This course is listed so you can find it later. Drop a scrape at{' '}
            <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">
              /workspace/flux-courses/{courseId}/curriculum.json
            </code>{' '}
            and run the import script to fill lessons.
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
              module={active.module}
              lesson={active.lesson}
              onBack={() => setView({ type: 'dashboard' })}
              onToggleSubtask={(subtaskId) =>
                store.toggleSubtask(active.module.id, active.lesson.id, subtaskId)
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

export default function App() {
  const prefsApi = useAppPrefs();
  const [tab, setTab] = useState<TopTab>('home');
  const [courseId, setCourseId] = useState<string | null>(null);

  const openCourse = (id: string) => {
    prefsApi.touchRecent(id);
    setCourseId(id);
    setTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLessonNav = (cId: string, moduleId: string, lessonId: string) => {
    prefsApi.touchRecent(cId);
    sessionStorage.setItem(DEEP_LINK_KEY, JSON.stringify({ courseId: cId, moduleId, lessonId }));
    setCourseId(cId);
    setTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showCourse = tab === 'home' && courseId != null;

  return (
    <div className="min-h-screen text-stone-800 dark:text-stone-100">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <TopNav
          tab={tab}
          onTab={(t) => {
            setTab(t);
            if (t !== 'home') setCourseId(null);
          }}
          theme={prefsApi.prefs.theme}
          onToggleTheme={prefsApi.toggleTheme}
        />

        {tab === 'home' && !showCourse && (
          <CoursePicker
            onSelect={openCourse}
            pinnedCourseId={prefsApi.prefs.pinnedCourseId}
            onPin={(id) => prefsApi.pinCourse(id)}
            showAll={prefsApi.prefs.showAllCourses}
            onShowAll={prefsApi.setShowAllCourses}
            visibleIds={prefsApi.visibleHomeCourseIds}
            queue={prefsApi.prefs.queue}
            onOpenLesson={openLessonNav}
            onTickQueue={prefsApi.tickQueueItem}
          />
        )}

        {showCourse && courseId && (
          <CourseWorkspace
            key={courseId}
            courseId={courseId}
            onBackHome={() => {
              setCourseId(null);
              prefsApi.refreshQueue();
            }}
            prefs={prefsApi.prefs}
            onTickQueue={prefsApi.tickQueueItem}
            onRefreshQueue={prefsApi.refreshQueue}
            onOpenQueueLesson={openLessonNav}
          />
        )}

        {tab === 'today' && (
          <TodayView
            schedule={prefsApi.prefs.schedule}
            queue={prefsApi.prefs.queue}
            pinnedCourseId={prefsApi.prefs.pinnedCourseId}
            onOpen={openLessonNav}
            onTickQueue={prefsApi.tickQueueItem}
            onSchedule={prefsApi.setScheduleDate}
          />
        )}

        {tab === 'upcoming' && (
          <UpcomingView schedule={prefsApi.prefs.schedule} onOpen={openLessonNav} />
        )}

        {tab === 'calendar' && (
          <CalendarView
            schedule={prefsApi.prefs.schedule}
            pinnedCourseId={prefsApi.prefs.pinnedCourseId}
            onSchedule={prefsApi.setScheduleDate}
            onOpen={openLessonNav}
          />
        )}

        {tab === 'sync' && (
          <SyncPanel
            prefs={prefsApi.prefs}
            onImported={(p) => {
              prefsApi.replacePrefs(p);
              window.location.reload();
            }}
            onMarkSynced={prefsApi.markSynced}
          />
        )}

        <footer className="mt-12 pb-6 text-center text-xs text-stone-400">
          Progress saved in your browser · built for calm focus, never guilt
        </footer>
      </div>
    </div>
  );
}
