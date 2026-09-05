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
import { COURSES } from './data/courses';
import { loadCourseState, saveCourseState } from './utils/storage';
import { applyStreakShield } from './utils/streakShield';
import { addDaysISO, todayKey } from './utils/dates';

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
  onPinLesson,
  onRecordUndo,
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
  focusMode: boolean;
  onExitFocus: () => void;
}) {
  const store = useCourseStore(courseId);
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
            This course is listed so you can find it later.
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

export default function App() {
  const prefsApi = useAppPrefs();
  const hasPlan = prefsApi.hasPlan;
  const [tab, setTab] = useState<TopTab>(() => (hasPlan ? 'today' : 'home'));
  const [courseId, setCourseId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  // Default to Today when a plan exists (once on mount / plan create)
  useEffect(() => {
    if (hasPlan && tab === 'home' && !courseId) {
      // soft: only nudge if user hasn't navigated into a course
    }
  }, [hasPlan, tab, courseId]);

  const openCourse = (id: string) => {
    prefsApi.touchRecent(id);
    setCourseId(id);
    setTab('home');
    setFocusMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLessonNav = (cId: string, moduleId: string, lessonId: string) => {
    prefsApi.touchRecent(cId);
    sessionStorage.setItem(DEEP_LINK_KEY, JSON.stringify({ courseId: cId, moduleId, lessonId }));
    setCourseId(cId);
    setTab('home');
    setFocusMode(true);
    prefsApi.setFocusLessonMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitFocusToToday = () => {
    setFocusMode(false);
    prefsApi.setFocusLessonMode(false);
    setCourseId(null);
    setTab('today');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const undoLast = () => {
    const u = prefsApi.prefs.lastUndo;
    if (!u || u.expiresAt < Date.now()) {
      prefsApi.clearUndo();
      return;
    }
    const course = COURSES.find((c) => c.id === u.courseId);
    if (!course) return;
    const state = loadCourseState(u.courseId, course.modules);
    const lesson = state.modules
      .find((m) => m.id === u.moduleId)
      ?.lessons.find((l) => l.id === u.lessonId);
    const sub = lesson?.subtasks.find((s) => s.id === u.subtaskId);
    if (sub && sub.completed) {
      sub.completed = false;
      if (lesson) lesson.completed = isLessonComplete(lesson);
      saveCourseState(u.courseId, state);
    }
    prefsApi.clearUndo();
    // Force remount of course workspace if open
    if (courseId === u.courseId) {
      setCourseId(null);
      requestAnimationFrame(() => setCourseId(u.courseId));
    } else {
      window.location.reload();
    }
  };

  const useShield = (weekKey: string) => {
    prefsApi.useStreakShield(weekKey);
    const yesterday = addDaysISO(todayKey(), -1);
    for (const c of COURSES) {
      const state = loadCourseState(c.id, c.modules);
      state.streakDates = applyStreakShield(state.streakDates, todayKey());
      saveCourseState(c.id, state);
    }
    prefsApi.markDayDone(yesterday);
  };

  const showCourse = tab === 'home' && courseId != null;
  const hideTabs = focusMode && showCourse;

  return (
    <div className="min-h-screen text-stone-800 dark:text-stone-100">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <TopNav
          tab={tab}
          hidden={hideTabs}
          onTab={(t) => {
            setTab(t);
            setFocusMode(false);
            prefsApi.setFocusLessonMode(false);
            if (t !== 'home') setCourseId(null);
          }}
          theme={prefsApi.prefs.theme}
          onToggleTheme={prefsApi.toggleTheme}
        />

        {prefsApi.prefs.lastUndo && prefsApi.prefs.lastUndo.expiresAt > Date.now() && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-stone-800 px-4 py-2 text-sm text-white dark:bg-stone-200 dark:text-stone-900">
            <span>Undo last check?</span>
            <button type="button" onClick={undoLast} className="font-semibold underline">
              Undo
            </button>
          </div>
        )}

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
            onGeneratePlan={prefsApi.generatePlan}
            hasPlan={hasPlan}
          />
        )}

        {showCourse && courseId && (
          <CourseWorkspace
            key={courseId}
            courseId={courseId}
            onBackHome={() => {
              setCourseId(null);
              setFocusMode(false);
              prefsApi.refreshQueue();
            }}
            prefs={prefsApi.prefs}
            onTickQueue={prefsApi.tickQueueItem}
            onRefreshQueue={prefsApi.refreshQueue}
            onOpenQueueLesson={openLessonNav}
            onPinLesson={prefsApi.pinLesson}
            onRecordUndo={prefsApi.recordUndo}
            focusMode={focusMode}
            onExitFocus={exitFocusToToday}
          />
        )}

        {tab === 'today' && (
          <TodayView
            prefs={prefsApi.prefs}
            queue={prefsApi.prefs.queue}
            onOpen={openLessonNav}
            onTickQueue={prefsApi.tickQueueItem}
            onSchedule={prefsApi.setScheduleDate}
            onGeneratePlan={prefsApi.generatePlan}
            onCatchUp={prefsApi.applyCatchUpCompress}
            onMarkDayDone={() => prefsApi.markDayDone()}
            onDeferPractice={prefsApi.setDeferPractice}
            onDismissWeeklyReview={prefsApi.dismissWeeklyReview}
            onUseShield={useShield}
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
            morningPingEnabled={prefsApi.prefs.morningPingEnabled}
            onMorningPing={prefsApi.setMorningPing}
          />
        )}

        <footer className="mt-12 pb-6 text-center text-xs text-stone-400">
          Progress saved in your browser · built for calm focus, never guilt
        </footer>
      </div>
    </div>
  );
}
