import type { CourseData, LessonKey } from '../types';
import { DEFAULT_ACCESS_UNTIL, hasAccessDeadline } from './access';
import {
  addDaysISO,
  daysBetweenISO,
  isEcommerceFocusClearDay,
  nextSchedulableDayISO,
  todayKeyKolkata,
} from './dates';
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

function dayISO(start: string, dayIndex: number): string {
  return addDaysISO(start, dayIndex);
}

/** Find a non-focus-clear day index in [0, effectiveDays), preferring `preferred`. */
function findOpenDayIndex(
  start: string,
  preferred: number,
  effectiveDays: number,
  hasDeadline: boolean,
  endCap: string,
): number | null {
  const tryIndex = (d: number) => {
    if (d < 0 || d >= effectiveDays) return false;
    const date = dayISO(start, d);
    if (isEcommerceFocusClearDay(date)) return false;
    if (hasDeadline && date > endCap) return false;
    return true;
  };

  if (tryIndex(preferred)) return preferred;
  for (let offset = 1; offset < effectiveDays; offset++) {
    if (tryIndex(preferred + offset)) return preferred + offset;
    if (tryIndex(preferred - offset)) return preferred - offset;
  }
  // Last resort: any open day in range
  for (let d = 0; d < effectiveDays; d++) {
    if (tryIndex(d)) return d;
  }
  return null;
}

/**
 * Generate a 40-day schedule from today (Asia/Kolkata).
 * Packs incomplete lessons from LEARNING_PATH_IDS in order (~105 min/day soft budget).
 * Never schedules on Ecommerce AI Sprint focus-clear days (2026-09-14 … 2026-09-18).
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

  const dayBudgets = Array.from({ length: effectiveDays }, () => 0);

  const assignToDay = (lesson: PlanLesson, preferredDay: number) => {
    const day = findOpenDayIndex(
      start,
      Math.max(0, Math.min(effectiveDays - 1, preferredDay)),
      effectiveDays,
      lesson.hasDeadline,
      endCap,
    );
    if (day == null) {
      // Extremely defensive: park just after focus week / past end of window
      schedule[lesson.key] = nextSchedulableDayISO(addDaysISO(start, effectiveDays));
      return;
    }
    dayBudgets[day] += lesson.estimatedMinutes;
    schedule[lesson.key] = dayISO(start, day);
  };

  const totalMin = lessons.reduce((n, l) => n + l.estimatedMinutes, 0);
  const avgPerDay = Math.max(TARGET_MIN_PER_DAY, Math.ceil(totalMin / effectiveDays));

  let cursorDay = 0;
  let cursorLoad = 0;

  // Skip starting on a focus-clear day
  while (cursorDay < effectiveDays - 1 && isEcommerceFocusClearDay(dayISO(start, cursorDay))) {
    cursorDay += 1;
  }

  for (const lesson of lessons) {
    // Boss-pin: leave for caller to restore an existing date (never place here)
    if (protect.has(lesson.key)) continue;

    if (cursorLoad + lesson.estimatedMinutes > avgPerDay * 1.15 && cursorDay < effectiveDays - 1) {
      cursorDay += 1;
      cursorLoad = 0;
      while (cursorDay < effectiveDays - 1 && isEcommerceFocusClearDay(dayISO(start, cursorDay))) {
        cursorDay += 1;
      }
    }

    if (lesson.hasDeadline) {
      const maxDay = Math.min(effectiveDays - 1, daysBetweenISO(start, endCap));
      if (cursorDay > maxDay) cursorDay = Math.max(0, maxDay);
    }

    assignToDay(lesson, cursorDay);
    cursorLoad += lesson.estimatedMinutes;
  }

  // Final scrub: never leave anything on focus-clear days
  for (const [key, date] of Object.entries(schedule)) {
    if (isEcommerceFocusClearDay(date)) {
      schedule[key] = nextSchedulableDayISO(addDaysISO(date, 1));
    }
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

/** Build N catch-up day buckets starting at `today`, skipping Ecommerce focus-clear days. */
function catchUpBuckets(today: string, count = 3): string[] {
  const buckets: string[] = [];
  let d = today;
  for (let i = 0; i < 40 && buckets.length < count; i++) {
    if (!isEcommerceFocusClearDay(d)) buckets.push(d);
    d = addDaysISO(d, 1);
  }
  while (buckets.length < count) {
    buckets.push(nextSchedulableDayISO(d));
    d = addDaysISO(buckets[buckets.length - 1], 1);
  }
  return buckets;
}

/**
 * Compress incomplete work from the past + next few days into the next 3 schedulable days.
 * Never moves the boss-pinned lesson off its date if set; never skips it.
 * Never lands catch-up work on Ecommerce focus-clear days (2026-09-14 … 2026-09-18).
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
  const nearEnd = addDaysISO(today, 2);
  for (const [key, date] of Object.entries(schedule)) {
    const inNearWindow = date <= nearEnd;
    const stuckOnFocus = isEcommerceFocusClearDay(date);
    if (!inNearWindow && !stuckOnFocus) continue;
    const [courseId, moduleId, lessonId] = key.split('::');
    const seed = byId.get(courseId);
    if (!seed) continue;
    const modules = peekCourseModules(seed.id, seed.modules);
    const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    if (!lesson || isLessonComplete(lesson)) continue;
    if (bossKey && key === bossKey) {
      // Boss stays put unless it sits on a focus-clear day
      if (stuckOnFocus) next[key] = nextSchedulableDayISO(addDaysISO(date, 1));
      continue;
    }
    incompleteKeys.push({ key, date });
  }

  incompleteKeys.sort((a, b) => a.date.localeCompare(b.date));
  const buckets = catchUpBuckets(today, 3);
  incompleteKeys.forEach((item, i) => {
    next[item.key] = buckets[i % 3];
  });

  return next;
}

export function planHasSchedule(schedule: Record<string, string>): boolean {
  return Object.keys(schedule).length > 0;
}
