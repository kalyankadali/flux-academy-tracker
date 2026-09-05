import type { CourseData } from '../types';
import { todayKey } from './dates';
import { peekCourseModules, loadCourseState } from './storage';

/** Minutes logged today across all courses (actual or estimated for completed subtasks). */
export function minutesLoggedToday(courses: CourseData[], day = todayKey()): number {
  let total = 0;
  for (const c of courses) {
    const state = loadCourseState(c.id, c.modules);
    for (const mod of state.modules) {
      for (const lesson of mod.lessons) {
        for (const sub of lesson.subtasks) {
          if (!sub.completed) continue;
          // Approximate: if completed today via wins, prefer wins; else count if win exists
        }
      }
    }
    for (const win of state.wins) {
      if (!win.completedAt) continue;
      const wday = todayKey(new Date(win.completedAt));
      if (wday !== day) continue;
      if (win.type !== 'subtask') continue;
      // find matching subtask estimate
      let found = false;
      for (const mod of state.modules) {
        for (const lesson of mod.lessons) {
          const sub = lesson.subtasks.find((s) => s.label === win.label && s.completed);
          if (sub) {
            total += sub.actualMinutes ?? sub.estimatedMinutes ?? 0;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }
  return total;
}

export function todayScheduledMinutes(
  schedule: Record<string, string>,
  courses: CourseData[],
  day = todayKey(),
): number {
  let total = 0;
  const byId = new Map(courses.map((c) => [c.id, c]));
  for (const [key, date] of Object.entries(schedule)) {
    if (date !== day) continue;
    const [courseId, moduleId, lessonId] = key.split('::');
    const seed = byId.get(courseId);
    if (!seed) continue;
    const modules = peekCourseModules(seed.id, seed.modules);
    const lesson = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    if (!lesson) continue;
    total +=
      lesson.subtasks.reduce((n, s) => n + (s.estimatedMinutes || 0), 0) ||
      lesson.durationMinutes ||
      20;
  }
  return total;
}

export function budgetStatus(
  logged: number,
  budget: number,
): 'under' | 'near' | 'met' | 'over' {
  if (logged >= budget) return logged > budget * 1.15 ? 'over' : 'met';
  if (logged >= budget * 0.85) return 'near';
  return 'under';
}
