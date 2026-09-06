import { useMemo, useState } from 'react';
import { COURSES } from '../data/courses';
import type { AppPrefs, LessonKey, QueueBatch } from '../types';
import { todayKey, todayKeyKolkata, addDaysISO, isSunday, isoWeekKey, isEcommerceFocusClearDay, computeStreak } from '../utils/dates';
import { parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules, loadCourseState } from '../utils/storage';
import { collectNextLessonKeys } from '../utils/queue';
import { DoThisNext } from './DoThisNext';
import { PlanGenerateControl } from './PlanGenerateControl';
import { IpadTip } from './IpadTip';
import { SprintWeekBanner } from './SprintWeekBanner';
import { WeeklyReviewCard } from './WeeklyReviewCard';
import { TodayScheduledBlock } from './TodayScheduledBlock';
import { TodayCloseBlock } from './TodayCloseBlock';
import { TodayBudgetBlock } from './TodayBudgetBlock';
import { WeekExportButton } from './WeekExportButton';
import { isLessonComplete } from '../utils/progress';
import { countDaysBehind } from '../utils/plan40';
import { budgetStatus, minutesLoggedToday, todayScheduledMinutes } from '../utils/dailyBudget';
import { canUseStreakShield } from '../utils/streakShield';
import { aggregateLearningPathPct } from '../utils/pathProgress';
import { ProgressBar } from './ProgressBar';

const SPRINT_URL = 'https://flux-academy.com/ecommerce-ai-sprint';

interface Props {
  prefs: AppPrefs;
  queue: QueueBatch;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
  onTickQueue: (key: LessonKey) => void;
  onSchedule: (key: LessonKey, date: string | null) => void;
  onGeneratePlan: () => void;
  onCatchUp: () => void;
  onMarkDayDone: () => void;
  onDeferPractice: (v: boolean) => void;
  onDismissWeeklyReview: () => void;
  onSaveWeeklyFocus: (note: string) => void;
  onDismissTip: () => void;
  onUseShield: (weekKey: string) => void;
}

export function TodayView({
  prefs, queue, onOpen, onTickQueue, onSchedule, onGeneratePlan, onCatchUp,
  onMarkDayDone, onDeferPractice, onDismissWeeklyReview, onSaveWeeklyFocus, onDismissTip, onUseShield,
}: Props) {
  const today = todayKey();
  const todayIST = todayKeyKolkata();
  const weekKey = isoWeekKey();
  const sprintFocus = isEcommerceFocusClearDay(todayIST);
  const [showClose, setShowClose] = useState(false);
  const [focusDraft, setFocusDraft] = useState(prefs.weeklyFocusNote ?? '');
  const schedule = prefs.schedule;
  const sprintHref = COURSES.find((c) => c.id === 'ecommerce-ai-sprint')?.url || SPRINT_URL;

  const scheduledToday = useMemo(() => {
    const items: { key: LessonKey; title: string; courseTitle: string; label: string; done: boolean; courseId: string; moduleId: string; lessonId: string }[] = [];
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== today && date !== todayIST) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson) continue;
      items.push({ key, title: lesson.title, courseTitle: course.title, label: lessonNumberLabel(mod, lesson), done: isLessonComplete(lesson), ...parsed });
    }
    return items;
  }, [schedule, today, todayIST]);

  const primary = sprintFocus ? null : scheduledToday.find((i) => !i.done) ?? null;

  const suggestions = useMemo(() => {
    if (sprintFocus || scheduledToday.length) return [];
    return collectNextLessonKeys(COURSES, prefs.pinnedCourseId, 3).map((key) => {
      const parsed = parseLessonKey(key)!;
      const course = COURSES.find((c) => c.id === parsed.courseId)!;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId)!;
      const lesson = mod.lessons.find((l) => l.id === parsed.lessonId)!;
      return { key, title: lesson.title, courseTitle: course.title, label: lessonNumberLabel(mod, lesson) };
    });
  }, [scheduledToday.length, prefs.pinnedCourseId, sprintFocus]);

  const streakDates = useMemo(() => {
    const dates = new Set<string>();
    for (const c of COURSES) {
      for (const d of loadCourseState(c.id, c.modules).streakDates) dates.add(d);
    }
    return [...dates];
  }, []);
  const streak = useMemo(() => computeStreak(streakDates), [streakDates]);
  const logged = useMemo(() => minutesLoggedToday(COURSES, today), []);
  const plannedMins = useMemo(
    () => todayScheduledMinutes(schedule, COURSES, today) || todayScheduledMinutes(schedule, COURSES, todayIST),
    [schedule, today, todayIST],
  );
  const budget = prefs.dailyBudgetMinutes;
  const bStatus = budgetStatus(logged, budget);
  const daysBehind = useMemo(() => countDaysBehind(schedule, COURSES, todayIST), [schedule, todayIST]);
  const dayDone = prefs.dayDoneDates.includes(today) || prefs.dayDoneDates.includes(todayIST);

  const tomorrowFirst = useMemo(() => {
    const tom = addDaysISO(todayIST, 1);
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== tom) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson || isLessonComplete(lesson)) continue;
      return { title: lesson.title, label: lessonNumberLabel(mod, lesson), ...parsed };
    }
    return null;
  }, [schedule, todayIST]);

  const todayWins = useMemo(() => {
    const wins: string[] = [];
    for (const c of COURSES) {
      for (const w of loadCourseState(c.id, c.modules).wins) {
        if (todayKey(new Date(w.completedAt)) === today) wins.push(w.label);
      }
    }
    return wins.slice(0, 8);
  }, [today]);

  const shield = canUseStreakShield({
    streakDates,
    budgetMetDates: prefs.dayDoneDates,
    shieldUsedWeek: prefs.streakShieldUsedWeek,
    today,
  });

  const showWeekly = isSunday() && prefs.weeklyReviewDismissedWeek !== weekKey;

  const pathAgg = useMemo(() => aggregateLearningPathPct(COURSES), []);

  const weekWins = useMemo(() => {
    const lessons: string[] = [];
    const subtasks: string[] = [];
    for (const c of COURSES) {
      for (const w of loadCourseState(c.id, c.modules).wins) {
        if (isoWeekKey(new Date(w.completedAt)) !== weekKey) continue;
        if (w.type === 'lesson' || w.type === 'module') lessons.push(w.label);
        else subtasks.push(w.label);
      }
    }
    return { lessons: lessons.slice(0, 6), subtasks: subtasks.slice(0, 4), lessonCount: lessons.length, subtaskCount: subtasks.length };
  }, [weekKey]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">Today</p>
            <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {sprintFocus ? 'Sprint week — live learning first; path lessons stay clear.' : streak === 0 ? 'A soft start is still a start — one task lights the streak.' : `${streak}-day streak · showing up is enough.`}
            </p>
          </div>
          <WeekExportButton schedule={schedule} />
        </div>
      </header>

      {!prefs.tipDismissed && <IpadTip onDismiss={onDismissTip} />}

      <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
            Learning path · {pathAgg.pct}%
          </p>
          <p className="text-[11px] text-stone-400">{pathAgg.subtasksDone}/{pathAgg.subtasksTotal} tasks</p>
        </div>
        <ProgressBar pct={pathAgg.pct} size="sm" />
      </div>

      <div className={`rounded-3xl border p-5 ${sprintFocus ? 'border-stone-100 bg-stone-50/40 opacity-80 dark:border-stone-800' : 'border-orange-100 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">40-day calm plan</h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {sprintFocus ? 'Plan days stay clear Sep 14–18 on purpose — no lesson backlog from today.' : 'Spreads your learning path (~90–120m/day) from today (IST). Sep 14–18 stays clear for the Ecommerce AI Sprint.'}
            </p>
          </div>
          {!sprintFocus && (
            <PlanGenerateControl hasPlan={Boolean(prefs.planGeneratedAt) || Object.keys(schedule).length > 0} planGeneratedAt={prefs.planGeneratedAt} onGenerate={onGeneratePlan} />
          )}
        </div>
      </div>

      {sprintFocus && <SprintWeekBanner href={sprintHref} />}

      {!sprintFocus && daysBehind >= 2 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-200">You’re about {daysBehind} days behind — no guilt. Compress the next 3 days? Boss-pinned lessons stay put.</p>
          <button type="button" onClick={onCatchUp} className="mt-2 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-medium text-white">Catch up · compress 3 days</button>
        </div>
      )}

      {!sprintFocus && shield.canShield && !streakDates.includes(addDaysISO(today, -1)) && (
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm text-stone-600 dark:text-stone-300">Missed a day? Streak shield is free once this week if you already met budget earlier.</p>
          <button type="button" onClick={() => onUseShield(shield.weekKey)} className="mt-2 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-stone-200 dark:text-stone-900">Use streak shield</button>
        </div>
      )}

      <TodayBudgetBlock
        sprintFocus={sprintFocus}
        logged={logged}
        budget={budget}
        bStatus={bStatus}
        plannedMins={plannedMins}
        prefs={prefs}
        onDeferPractice={onDeferPractice}
      />

      {primary && (
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm dark:border-orange-900/50 dark:from-orange-950/40 dark:to-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">Primary focus</p>
          <p className="mt-1 text-xs text-orange-600/80 dark:text-orange-300/80">{primary.label}</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-100">{primary.title}</h2>
          <p className="text-xs text-stone-400">{primary.courseTitle}</p>
          <button type="button" onClick={() => onOpen(primary.courseId, primary.moduleId, primary.lessonId)} className="mt-4 w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm">Open current lesson</button>
        </div>
      )}

      <DoThisNext queue={queue} onOpen={onOpen} onTick={onTickQueue} deemphasized={sprintFocus} />

      <TodayScheduledBlock
        sprintFocus={sprintFocus}
        scheduledToday={scheduledToday}
        suggestions={suggestions}
        today={today}
        onOpen={onOpen}
        onSchedule={onSchedule}
      />

      <TodayCloseBlock
        dayDone={dayDone}
        showClose={showClose}
        todayWins={todayWins}
        tomorrowFirst={tomorrowFirst}
        sprintFocus={sprintFocus}
        onMarkDayDone={onMarkDayDone}
        onShowClose={() => setShowClose(true)}
      />

      {showWeekly && (
        <WeeklyReviewCard
          lessonCount={weekWins.lessonCount}
          subtaskCount={weekWins.subtaskCount}
          lessonLabels={weekWins.lessons}
          subtaskLabels={weekWins.subtasks}
          streak={streak}
          focusDraft={focusDraft}
          onFocusDraft={setFocusDraft}
          lastFocusNote={prefs.weeklyFocusNote}
          showLastFocus={prefs.lastWeeklyReviewWeekKey !== weekKey}
          onSkip={onDismissWeeklyReview}
          onSave={() => { onSaveWeeklyFocus(focusDraft); onDismissWeeklyReview(); }}
        />
      )}

      {!showWeekly && prefs.weeklyFocusNote && (
        <p className="text-center text-xs text-stone-400">This week’s gentle focus: <span className="text-stone-600 dark:text-stone-300">{prefs.weeklyFocusNote}</span></p>
      )}
    </section>
  );
}
