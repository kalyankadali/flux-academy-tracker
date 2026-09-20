import { lazy, Suspense, useEffect, useState } from 'react';
import { TopNav } from './components/TopNav';
import { CourseWorkspace, DEEP_LINK_KEY } from './components/CourseWorkspace';

const CoursePicker = lazy(() =>
  import('./components/CoursePicker').then((m) => ({ default: m.CoursePicker })),
);
const TodayView = lazy(() =>
  import('./components/TodayView').then((m) => ({ default: m.TodayView })),
);
const UpcomingView = lazy(() =>
  import('./components/UpcomingView').then((m) => ({ default: m.UpcomingView })),
);
const CalendarView = lazy(() =>
  import('./components/CalendarView').then((m) => ({ default: m.CalendarView })),
);
const SyncPanel = lazy(() =>
  import('./components/SyncPanel').then((m) => ({ default: m.SyncPanel })),
);

import { useAppPrefs } from './hooks/useAppPrefs';
import { useAutoCloudSync } from './hooks/useAutoCloudSync';
import type { LessonKey, TopTab } from './types';
import { parseLessonKey } from './utils/lessonKeys';
import { isLessonComplete } from './utils/progress';
import { COURSES } from './data/courses';
import { loadCourseState, saveCourseState } from './utils/storage';
import { applyStreakShield } from './utils/streakShield';
import { addDaysISO, todayKey } from './utils/dates';

function TabFallback() {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white/80 p-8 text-center text-sm text-stone-400 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-500">
      Loading…
    </div>
  );
}

export default function App() {
  const prefsApi = useAppPrefs();
  useAutoCloudSync(prefsApi.prefs, prefsApi.replacePrefs, () => prefsApi.markSynced());
  useEffect(() => {
    prefsApi.rolloverDailyStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') prefsApi.rolloverDailyStreak();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hasPlan = prefsApi.hasPlan;
  const [tab, setTab] = useState<TopTab>(() => (hasPlan ? 'today' : 'home'));
  const [courseId, setCourseId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [highlightPrimary, setHighlightPrimary] = useState(false);
  const [highlightLessonKey, setHighlightLessonKey] = useState<LessonKey | null>(null);

  // Prefer Today when a plan exists (initial tab already set; nudge from bare home)
  useEffect(() => {
    if (hasPlan && tab === 'home' && !courseId) {
      setTab('today');
    }
  }, [hasPlan]); // eslint-disable-line react-hooks/exhaustive-deps -- mount / plan-create only

  // Deep links: ?main=1 → Today + primary highlight; ?lesson=<key> → open lesson or Today highlight
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const main = params.get('main');
    const lessonRaw = params.get('lesson');
    if (!main && !lessonRaw) return;

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('main');
      url.searchParams.delete('lesson');
      const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash;
      window.history.replaceState({}, '', next);
    };

    if (lessonRaw) {
      let key = lessonRaw;
      try {
        key = decodeURIComponent(lessonRaw);
      } catch {
        /* keep raw */
      }
      const parsed = parseLessonKey(key);
      const course = parsed ? COURSES.find((c) => c.id === parsed.courseId) : undefined;
      const mod = course && !course.comingSoon
        ? course.modules.find((m) => m.id === parsed!.moduleId)
        : undefined;
      const lesson = mod?.lessons.find((l) => l.id === parsed!.lessonId);
      if (parsed && course && mod && lesson) {
        prefsApi.touchRecent(parsed.courseId);
        sessionStorage.setItem(
          DEEP_LINK_KEY,
          JSON.stringify({
            courseId: parsed.courseId,
            moduleId: parsed.moduleId,
            lessonId: parsed.lessonId,
          }),
        );
        setCourseId(parsed.courseId);
        setTab('home');
        setFocusMode(true);
        prefsApi.setFocusLessonMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setCourseId(null);
        setTab('today');
        setHighlightLessonKey(key);
        setHighlightPrimary(false);
      }
      cleanUrl();
      return;
    }

    if (main === '1') {
      setCourseId(null);
      setTab('today');
      setHighlightPrimary(true);
      setFocusMode(false);
      prefsApi.setFocusLessonMode(false);
      cleanUrl();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- boot only

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

        <Suspense fallback={<TabFallback />}>
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
            onFirstWinOfDay={prefsApi.markFirstWinDay}
            onLessonFinish={(patch) => prefsApi.patchPrefs(patch)}
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
            onSaveWeeklyFocus={prefsApi.saveWeeklyFocusNote}
            onDismissTip={prefsApi.dismissTip}
            onUseShield={useShield}
            onUseFreeze={() => prefsApi.applyStreakFreeze()}
            onDismissStreakBanner={prefsApi.dismissStreakSoftBanner}
            onPatchPrefs={prefsApi.patchPrefs}
            highlightPrimary={highlightPrimary}
            highlightLessonKey={highlightLessonKey}
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
            tipDismissed={prefsApi.prefs.tipDismissed}
            onDismissTip={prefsApi.dismissTip}
          />
        )}

        </Suspense>

        <footer className="mt-12 pb-6 text-center text-xs text-stone-400">
          Progress saved in your browser · built for calm focus, never guilt
        </footer>
      </div>
    </div>
  );
}
