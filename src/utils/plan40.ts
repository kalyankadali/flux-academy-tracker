import type { CourseData, LessonKey } from '../types';
import { DEFAULT_ACCESS_UNTIL, hasAccessDeadline } from './access';
import { addDaysISO, daysBetweenISO, todayKeyKolkata } from './dates';
import { LEARNING_PATH_IDS } from './learningPath';
import { makeLessonKey } from './lessonKeys';
import { isLessonComplete } from './progress';
import { peekCourseModules } from './storage';

const PLAN_DAYS = 40;
const TARGET_MIN_PER_DAY = 105; // soft mid of 90–120

export interface PlanLesson {
  key: LessonKey;
  courseId: string;
  estimatedMinutes: number;
  hasDeadline: boolean;
}

/** Flatten incomplete lessons in learning-path order (includes Core Design Skills mid-path). */
export function collectPlanLessons(courses: CourseData[]): PlanLesson[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const out: PlanLesson[] = [];

  for (const courseId of LEARNING_PATH_IDS) {
    const seed = byId.get(courseId);
    if (!seed || seed.comingSoon) continue;
    const modules = peekCourseModules(seed.id, seed.modules);
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (isLessonComplete(lesson)) continue;
        const est =
          lesson.subtasks.reduce((n, s) => n + (s.estimatedMinutes || 0), 0) ||
          lesson.durationMinutes ||
          20;
        out.push({
          key: makeLessonKey(courseId, mod.id, lesson.id),
          courseId,
          estimatedMinutes: est,
          hasDeadline: hasAccessDeadline(courseId),
        });
      }
    }
  }
  return out;
}

/**
 * Generate a 40-day schedule from today (Asia/Kolkata).
 * Deadline courses are packed earlier when possible; path order preserved.
 * Excluded-from-% courses (Becoming Pro / Freelancing / Webflow) stay after
 * Web Design Masterclass per LEARNING_PATH_IDS order.
 */
export function generate40DayPlan(
  courses: CourseData[],
  options?: { startISO?: string; protectKeys?: Set<LessonKey> },
): Record<string, string> {
  const start = options?.startISO ?? todayKeyKolkata();
  const protect = options?.protectKeys ?? new Set<LessonKey>();
  const lessons = collectPlanLessons(courses);
  const schedule: Record<string, string> = {};

  const endCap = DEFAULT_ACCESS_UNTIL;
  const daysToDeadline = Math.max(1, daysBetweenISO(start, endCap) + 1);
  const effectiveDays = Math.min(PLAN_DAYS, Math.max(daysToDeadline, PLAN_DAYS));

  // Two pools: deadline courses first window, then rest — but keep relative path order
  // by walking the single ordered list and assigning day slots with a soft budget.
  const dayBudgets = Array.from({ length: effectiveDays }, () => 0);
  const dayKeys: LessonKey[][] = Array.from({ length: effectiveDays }, () => []);

  const assignToDay = (lesson: PlanLesson, preferredDay: number) => {
    let day = Math.max(0, Math.min(effectiveDays - 1, preferredDay));
    // Prefer a day under budget; scan forward then backward
    const tryPlace = (d: number) => {
      if (d < 0 || d >= effectiveDays) return false;
      if (lesson.hasDeadline) {
        const date = addDaysISO(start, d);
        if (date > endCap) return false;
      }
      dayBudgets[d] += lesson.estimatedMinutes;
      dayKeys[d].push(lesson.key);
      schedule[lesson.key] = addDaysISO(start, d);
      return true;
    };

    if (tryPlace(day)) return;
    for (let offset = 1; offset < effectiveDays; offset++) {
      if (tryPlace(day + offset)) return;
      if (tryPlace(day - offset)) return;
    }
    // Fallback: last day
    const last = effectiveDays - 1;
    dayBudgets[last] += lesson.estimatedMinutes;
    dayKeys[last].push(lesson.key);
    schedule[lesson.key] = addDaysISO(start, last);
  };

  // Estimate total minutes to spread across days
  const totalMin = lessons.reduce((n, l) => n + l.estimatedMinutes, 0);
  const avgPerDay = Math.max(TARGET_MIN_PER_DAY, Math.ceil(totalMin / effectiveDays));

  let cursorDay = 0;
  let cursorLoad = 0;

  for (const lesson of lessons) {
    if (protect.has(lesson.key) && schedule[lesson.key]) continue;

    // Soft fill: advance day when over average budget
    if (cursorLoad + lesson.estimatedMinutes > avgPerDay * 1.15 && cursorDay < effectiveDays - 1) {
      cursorDay += 1;
      cursorLoad = 0;
    }

    // Deadline courses shouldn't land after access end
    if (lesson.hasDeadline) {
      const maxDay = Math.min(effectiveDays - 1, daysBetweenISO(start, endCap));
      if (cursorDay > maxDay) cursorDay = Math.max(0, maxDay);
    }

    assignToDay(lesson, cursorDay);
    cursorLoad += lesson.estimatedMinutes;
  }

  return schedule;
}

/** How many scheduled days before today still have incomplete lessons? */
export function countDaysBehind(
  schedule: Record<string, string>,
  courses: CourseData[],
  today = todayKeyKolkata(),
): number {
  const behindDates = new Set<string>();
  const byId = new Map(courses.map((c) => [c.id, c]));
  for (const [key, date] of Object.entries(schedule)) {
    if (date >= today) continue;
    const [courseId, moduleId, lessonId] = key.split('::');
    const seed = byId.get(courseId);
    if (!seed) continue;
    const modules = peekCourseModules(seed.id, seed.modules);
    const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    if (lesson && !isLessonComplete(lesson)) behindDates.add(date);
  }
  return behindDates.size;
}

/**
 * Compress incomplete work from the past + next few days into the next 3 days.
 * Never moves the boss-pinned lesson off its date if set; never skips it.
 */
export function compressCatchUp(
  schedule: Record<string, string>,
  courses: CourseData[],
  options?: { today?: string; bossKey?: LessonKey | null },
): Record<string, string> {
  const today = options?.today ?? todayKeyKolkata();
  const bossKey = options?.bossKey ?? null;
  const next = { ...schedule };
  const byId = new Map(courses.map((c) => [c.id, c]));

  const incompleteKeys: { key: LessonKey; date: string }[] = [];
  for (const [key, date] of Object.entries(schedule)) {
    if (date > addDaysISO(today, 2)) continue;
    const [courseId, moduleId, lessonId] = key.split('::');
    const seed = byId.get(courseId);
    if (!seed) continue;
    const modules = peekCourseModules(seed.id, seed.modules);
    const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    if (!lesson || isLessonComplete(lesson)) continue;
    if (bossKey && key === bossKey) continue; // leave boss where it is
    incompleteKeys.push({ key, date });
  }

  incompleteKeys.sort((a, b) => a.date.localeCompare(b.date));
  const buckets = [today, addDaysISO(today, 1), addDaysISO(today, 2)];
  incompleteKeys.forEach((item, i) => {
    next[item.key] = buckets[i % 3];
  });

  return next;
}

export function planHasSchedule(schedule: Record<string, string>): boolean {
  return Object.keys(schedule).length > 0;
}
