import type { CourseData, LessonKey } from '../types';
import { hasAccessDeadline } from './access';
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

/** Locked plan end (user lock). Access label may stay Oct 23 separately. */
export const PLAN_END_ISO = '2026-10-22';
/** Soft cap for incomplete lessons when regenerating on Kolkata "today". */
export const TODAY_SOFT_MINUTES = 30;

export interface PlanLesson {
  key: LessonKey;
  courseId: string;
  estimatedMinutes: number;
  hasDeadline: boolean;
}

export interface GeneratePlanResult {
  schedule: Record<string, string>;
  /** Equal-day soft target for full days (ceil remainingMinutes / fullDays). */
  avgFullDayMinutes: number;
  /** Calendar days from start through PLAN_END_ISO inclusive. */
  planDays: number;
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

/** Inclusive day count from start → end (derived, not hard-coded 40). */
export function planDaysBetween(startISO: string, endISO = PLAN_END_ISO): number {
  if (startISO > endISO) return 0;
  return daysBetweenISO(startISO, endISO) + 1;
}

function enumerateDaysInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const days: string[] = [];
  let d = from;
  while (d <= to) {
    days.push(d);
    d = addDaysISO(d, 1);
  }
  return days;
}

/**
 * Generate a locked schedule from start through PLAN_END_ISO (Asia/Kolkata).
 * - When start is Kolkata today: soft-cap ~TODAY_SOFT_MINUTES of whole lessons, then
 *   pack remaining equally across every calendar day through end (no Ecommerce skip).
 * - Boss/protectKeys: skipped here; caller restores pinned dates.
 */
export function generate40DayPlan(
  courses: CourseData[],
  options?: { startISO?: string; protectKeys?: Set<LessonKey> },
): GeneratePlanResult {
  const start = options?.startISO ?? todayKeyKolkata();
  const end = PLAN_END_ISO;
  const today = todayKeyKolkata();
  const protect = options?.protectKeys ?? new Set<LessonKey>();
  const allLessons = collectPlanLessons(courses);
  const schedule: Record<string, string> = {};
  const planDays = planDaysBetween(start, end);

  if (planDays === 0) {
    return { schedule, avgFullDayMinutes: 0, planDays: 0 };
  }

  // Path order; leave protected lessons for caller to restore
  const lessons = allLessons.filter((l) => !protect.has(l.key));
  let cursor = 0;

  // --- Today soft cap (only when plan starts on Kolkata today) ---
  let fullDayStart = start;
  if (start === today && start <= end && lessons.length > 0) {
    const first = lessons[0];
    if (first.estimatedMinutes > TODAY_SOFT_MINUTES) {
      // Prefer skip today and start tomorrow for oversized first lesson
      // (even ≤45 — only pack today when the first lesson fits the soft cap)
    } else {
      let load = 0;
      while (cursor < lessons.length) {
        const lesson = lessons[cursor];
        if (load + lesson.estimatedMinutes <= TODAY_SOFT_MINUTES) {
          schedule[lesson.key] = start;
          load += lesson.estimatedMinutes;
          cursor += 1;
        } else {
          break;
        }
      }
      if (cursor > 0) {
        fullDayStart = addDaysISO(start, 1);
      }
    }
  }

  const remaining = lessons.slice(cursor);
  let fullDays = enumerateDaysInclusive(fullDayStart, end);
  // If today consumed the only day, park leftovers on end
  if (remaining.length > 0 && fullDays.length === 0) {
    fullDays = [end];
  }

  const remainingMinutes = remaining.reduce((n, l) => n + l.estimatedMinutes, 0);
  const avgFullDayMinutes =
    fullDays.length > 0 ? Math.ceil(remainingMinutes / fullDays.length) : 0;
  const softCap = avgFullDayMinutes * 1.25;

  // Equal pack in path order: bucket by cumulative minutes so every full day
  // gets a share. Allow up to softCap on a day; oversized lessons may sit alone.
  const dayLoads = fullDays.map(() => 0);
  let placedMinutes = 0;

  for (const lesson of remaining) {
    let dayIndex =
      avgFullDayMinutes > 0
        ? Math.min(
            fullDays.length - 1,
            Math.floor(placedMinutes / avgFullDayMinutes),
          )
        : 0;

    // If this day is already past softCap and we still have later days, nudge forward
    // (unless the lesson would be alone on an empty day — oversized alone is OK).
    while (
      dayIndex < fullDays.length - 1 &&
      dayLoads[dayIndex] > 0 &&
      dayLoads[dayIndex] + lesson.estimatedMinutes > softCap
    ) {
      dayIndex += 1;
    }

    schedule[lesson.key] = fullDays[dayIndex];
    dayLoads[dayIndex] += lesson.estimatedMinutes;
    placedMinutes += lesson.estimatedMinutes;
  }

  return { schedule, avgFullDayMinutes, planDays };
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
