import { useMemo, useState } from 'react';
import { COURSES } from '../data/courses';
import type { AppPrefs, LessonKey, QueueBatch } from '../types';
import { todayKey, todayKeyKolkata, addDaysISO, formatMinutes, isSunday, isoWeekKey } from '../utils/dates';
import { parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules, loadCourseState } from '../utils/storage';
import { collectNextLessonKeys } from '../utils/queue';
import { DoThisNext } from './DoThisNext';
import { isLessonComplete } from '../utils/progress';
import { countDaysBehind } from '../utils/plan40';
import { budgetStatus, minutesLoggedToday, todayScheduledMinutes } from '../utils/dailyBudget';
import { canUseStreakShield } from '../utils/streakShield';
import { computeStreak } from '../utils/dates';

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
  onUseShield: (weekKey: string) => void;
}

export function TodayView({
  prefs,
  queue,
  onOpen,
  onTickQueue,
  onSchedule,
  onGeneratePlan,
  onCatchUp,
  onMarkDayDone,
  onDeferPractice,
  onDismissWeeklyReview,
  onUseShield,
}: Props) {
  const today = todayKey();
  const todayIST = todayKeyKolkata();
  const [showClose, setShowClose] = useState(false);
  const schedule = prefs.schedule;

  const scheduledToday = useMemo(() => {
    const items: {
      key: LessonKey;
      title: string;
      courseTitle: string;
      label: string;
      done: boolean;
      courseId: string;
      moduleId: string;
      lessonId: string;
    }[] = [];
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
      items.push({
        key,
        title: lesson.title,
        courseTitle: course.title,
        label: lessonNumberLabel(mod, lesson),
        done: isLessonComplete(lesson),
        courseId: parsed.courseId,
        moduleId: parsed.moduleId,
        lessonId: parsed.lessonId,
      });
    }
    return items;
  }, [schedule, today, todayIST]);

  const primary = scheduledToday.find((i) => !i.done) ?? null;

  const suggestions = useMemo(() => {
    if (scheduledToday.length) return [];
    return collectNextLessonKeys(COURSES, prefs.pinnedCourseId, 3).map((key) => {
      const parsed = parseLessonKey(key)!;
      const course = COURSES.find((c) => c.id === parsed.courseId)!;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId)!;
      const lesson = mod.lessons.find((l) => l.id === parsed.lessonId)!;
      return {
        key,
        title: lesson.title,
        courseTitle: course.title,
        label: lessonNumberLabel(mod, lesson),
      };
    });
  }, [scheduledToday.length, prefs.pinnedCourseId]);

  const streakDates = useMemo(() => {
    const dates = new Set<string>();
    for (const c of COURSES) {
      const state = loadCourseState(c.id, c.modules);
      for (const d of state.streakDates) dates.add(d);
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
      return { key, title: lesson.title, courseTitle: course.title, label: lessonNumberLabel(mod, lesson), ...parsed };
    }
    return null;
  }, [schedule, todayIST]);

  const todayWins = useMemo(() => {
    const wins: string[] = [];
    for (const c of COURSES) {
      const state = loadCourseState(c.id, c.modules);
      for (const w of state.wins) {
        if (todayKey(new Date(w.completedAt)) === today) wins.push(w.label);
      }
    }
    return wins.slice(0, 8);
  }, [today]);

  const shield = canUseStreakShield({
    streakDates,
    budgetMetDates: prefs.dayDoneDates, // approximate: days marked done counted as budget-met
    shieldUsedWeek: prefs.streakShieldUsedWeek,
    today,
  });

  const showWeekly =
    isSunday() && prefs.weeklyReviewDismissedWeek !== isoWeekKey();

  const weekStats = useMemo(() => {
    let lessons = 0;
    for (const c of COURSES) {
      const state = loadCourseState(c.id, c.modules);
      for (const w of state.wins) {
        if (w.type !== 'lesson') continue;
        const d = new Date(w.completedAt);
        if (isoWeekKey(d) === isoWeekKey()) lessons += 1;
      }
    }
    return { lessons };
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Today
        </p>
        <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {streak === 0
            ? 'A soft start is still a start — one task lights the streak.'
            : `${streak}-day streak · showing up is enough.`}
        </p>
      </header>

      {/* 40-day plan CTA */}
      <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">40-day calm plan</h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Spreads your learning path (~90–120m/day) from today (IST) toward Oct 23 access where needed.
              Core Design Skills stays mid-path; Webflow & freelancing land later.
            </p>
            {prefs.planGeneratedAt && (
              <p className="mt-1 text-[11px] text-stone-400">
                Last generated{' '}
                {new Date(prefs.planGeneratedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                Object.keys(schedule).length &&
                !window.confirm('Replace your current schedule with a fresh 40-day plan?')
              ) {
                return;
              }
              onGeneratePlan();
            }}
            className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white"
          >
            Generate 40-day plan
          </button>
        </div>
      </div>

      {daysBehind >= 2 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            You’re about {daysBehind} days behind — no guilt. Compress the next 3 days?
            Boss-pinned lessons stay put.
          </p>
          <button
            type="button"
            onClick={onCatchUp}
            className="mt-2 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Catch up · compress 3 days
          </button>
        </div>
      )}

      {shield.canShield && !streakDates.includes(addDaysISO(today, -1)) && (
        <div className="rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Missed a day? Streak shield is free once this week if you already met budget earlier.
          </p>
          <button
            type="button"
            onClick={() => onUseShield(shield.weekKey)}
            className="mt-2 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-stone-200 dark:text-stone-900"
          >
            Use streak shield
          </button>
        </div>
      )}

      {/* Soft daily budget */}
      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Today’s soft budget</h2>
          <span className="text-xs text-stone-400">
            {formatMinutes(logged)} / {formatMinutes(budget)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className={`h-full rounded-full transition-all ${
              bStatus === 'met' || bStatus === 'over' ? 'bg-emerald-400' : 'bg-orange-400'
            }`}
            style={{ width: `${Math.min(100, Math.round((logged / budget) * 100))}%` }}
          />
        </div>
        {(bStatus === 'met' || bStatus === 'over') && (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            Beautiful — budget met. Celebrate and stop. Rest is productive.
          </p>
        )}
        {plannedMins > 0 && (
          <p className="mt-1 text-xs text-stone-400">Scheduled today ~{formatMinutes(plannedMins)}</p>
        )}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <input
            type="checkbox"
            checked={prefs.deferPractice}
            onChange={(e) => onDeferPractice(e.target.checked)}
            className="rounded border-stone-300 text-orange-600"
          />
          Defer practice tasks (prep / watch first)
        </label>
      </div>

      {primary && (
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm dark:border-orange-900/50 dark:from-orange-950/40 dark:to-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
            Primary focus
          </p>
          <p className="mt-1 text-xs text-orange-600/80 dark:text-orange-300/80">{primary.label}</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-100">{primary.title}</h2>
          <p className="text-xs text-stone-400">{primary.courseTitle}</p>
          <button
            type="button"
            onClick={() => onOpen(primary.courseId, primary.moduleId, primary.lessonId)}
            className="mt-4 w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Open current lesson
          </button>
        </div>
      )}

      <DoThisNext queue={queue} onOpen={onOpen} onTick={onTickQueue} />

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Scheduled for today</h2>
        {scheduledToday.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Nothing dated for today yet. Generate a 40-day plan, or try the suggestions below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scheduledToday.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-orange-50/60 px-3 py-2.5 dark:bg-orange-950/30"
              >
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{item.label}</p>
                  <p
                    className={`text-sm font-medium ${
                      item.done
                        ? 'text-stone-400 line-through'
                        : 'text-stone-800 dark:text-stone-100'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-stone-400">{item.courseTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(item.courseId, item.moduleId, item.lessonId)}
                  className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Gentle planner suggestions
          </h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5 dark:bg-stone-800"
              >
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{s.label}</p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{s.title}</p>
                  <p className="text-xs text-stone-400">{s.courseTitle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSchedule(s.key, today)}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-stone-900 dark:text-orange-300 dark:ring-orange-800"
                  >
                    Schedule today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseLessonKey(s.key)!;
                      onOpen(p.courseId, p.moduleId, p.lessonId);
                    }}
                    className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Close today ritual */}
      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Close today</h2>
        {dayDone ? (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Day marked done. Rest well.</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              onMarkDayDone();
              setShowClose(true);
            }}
            className="mt-3 rounded-xl bg-stone-800 px-3 py-2 text-sm font-medium text-white dark:bg-stone-200 dark:text-stone-900"
          >
            Mark day done
          </button>
        )}
        {showClose && (
          <div className="mt-3 space-y-2 rounded-2xl bg-orange-50/60 p-3 dark:bg-orange-950/30">
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Today’s wins</p>
            {todayWins.length === 0 ? (
              <p className="text-sm text-stone-500">Showing up counted. That’s enough.</p>
            ) : (
              <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-300">
                {todayWins.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {tomorrowFirst && (
              <div className="mt-2 border-t border-orange-100 pt-2 dark:border-orange-900/40">
                <p className="text-xs text-stone-400">Tomorrow’s first lesson</p>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{tomorrowFirst.title}</p>
                <p className="text-xs text-stone-400">{tomorrowFirst.label}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showWeekly && (
        <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5 dark:border-orange-900/40 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Sunday · 2‑min weekly review</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            This week you completed about <strong>{weekStats.lessons}</strong> lesson
            {weekStats.lessons === 1 ? '' : 's'}. Streak: {streak} day{streak === 1 ? '' : 's'}.
          </p>
          <p className="mt-1 text-xs text-stone-400">
            What felt light? What to gently protect next week? No scores — just noticing.
          </p>
          <button
            type="button"
            onClick={onDismissWeeklyReview}
            className="mt-3 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            Done for this week
          </button>
        </div>
      )}
    </section>
  );
}
