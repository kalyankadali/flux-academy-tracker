import { COURSES } from '../data/courses';
import type { CourseData, LessonKey } from '../types';
import {
  formatMinutes,
  isEcommerceFocusClearDay,
  weekBoundsKolkata,
  weekDayKeys,
  formatWeekOfLabel,
  ECOMMERCE_FOCUS_CLEAR_START,
  ECOMMERCE_FOCUS_CLEAR_END,
} from './dates';
import { parseLessonKey, lessonNumberLabel } from './lessonKeys';
import { peekCourseModules } from './storage';
import { isLessonComplete } from './progress';

export interface WeekExportLesson {
  key: LessonKey;
  date: string;
  courseTitle: string;
  lessonTitle: string;
  label: string;
  /** Prefer video durationMinutes; fall back to plan (subtask) estimate. */
  minutes: number;
  minutesLabel: string;
  done: boolean;
  focusClear: boolean;
}

export interface WeekExportData {
  weekKey: string;
  monday: string;
  sunday: string;
  weekOfLabel: string;
  lessons: WeekExportLesson[];
  /** Focus-clear days that fall inside this week (may have zero scheduled lessons). */
  focusClearDaysInWeek: string[];
  totalMinutes: number;
}

/** Sheet minutes: prefer video duration, else plan estimate from subtasks. */
export function sheetMinutesForLesson(lesson: {
  durationMinutes: number;
  subtasks: { estimatedMinutes: number }[];
}): number {
  if (lesson.durationMinutes && lesson.durationMinutes > 0) return lesson.durationMinutes;
  const plan = lesson.subtasks.reduce((n, s) => n + (s.estimatedMinutes || 0), 0);
  return plan || 20;
}

export function collectWeekExport(
  schedule: Record<string, string>,
  courses: CourseData[] = COURSES,
  when = new Date(),
): WeekExportData {
  const { monday, sunday, weekKey } = weekBoundsKolkata(when);
  const days = weekDayKeys(monday);
  const daySet = new Set(days);
  const focusClearDaysInWeek = days.filter(isEcommerceFocusClearDay);

  const lessons: WeekExportLesson[] = [];
  for (const [key, date] of Object.entries(schedule)) {
    if (!daySet.has(date)) continue;
    const parsed = parseLessonKey(key);
    if (!parsed) continue;
    const course = courses.find((c) => c.id === parsed.courseId);
    if (!course) continue;
    const modules = peekCourseModules(course.id, course.modules);
    const mod = modules.find((m) => m.id === parsed.moduleId);
    const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
    if (!mod || !lesson) continue;
    const minutes = sheetMinutesForLesson(lesson);
    lessons.push({
      key,
      date,
      courseTitle: course.title,
      lessonTitle: lesson.title,
      label: lessonNumberLabel(mod, lesson),
      minutes,
      minutesLabel: formatMinutes(minutes),
      done: isLessonComplete(lesson),
      focusClear: isEcommerceFocusClearDay(date),
    });
  }
  lessons.sort((a, b) => a.date.localeCompare(b.date) || a.courseTitle.localeCompare(b.courseTitle));

  return {
    weekKey,
    monday,
    sunday,
    weekOfLabel: formatWeekOfLabel(monday, sunday),
    lessons,
    focusClearDaysInWeek,
    totalMinutes: lessons.reduce((n, l) => n + l.minutes, 0),
  };
}

export function focusClearRangeLabel(): string {
  const start = ECOMMERCE_FOCUS_CLEAR_START.slice(5).replace('-', '/');
  const end = ECOMMERCE_FOCUS_CLEAR_END.slice(5).replace('-', '/');
  // Prefer calm month names when in Sep
  if (ECOMMERCE_FOCUS_CLEAR_START.startsWith('2026-09')) return 'Sep 14–18';
  return `${start}–${end}`;
}
