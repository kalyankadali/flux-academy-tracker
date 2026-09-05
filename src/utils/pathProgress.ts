import type { CourseData } from '../types';
import { AGGREGATE_PATH_IDS } from './learningPath';
import { overallProgress } from './progress';
import { peekCourseModules } from './storage';

/** Single Learning path % covering AGGREGATE_PATH_IDS only. */
export function aggregateLearningPathPct(courses: CourseData[]): {
  pct: number;
  subtasksDone: number;
  subtasksTotal: number;
  coursesReady: number;
} {
  let subtasksDone = 0;
  let subtasksTotal = 0;
  let coursesReady = 0;
  for (const id of AGGREGATE_PATH_IDS) {
    const seed = courses.find((c) => c.id === id);
    if (!seed || seed.comingSoon || !seed.modules.length) continue;
    coursesReady += 1;
    const modules = peekCourseModules(seed.id, seed.modules);
    const stats = overallProgress(modules);
    subtasksDone += stats.subtasksDone;
    subtasksTotal += stats.subtasksTotal;
  }
  return {
    pct: subtasksTotal ? Math.round((subtasksDone / subtasksTotal) * 100) : 0,
    subtasksDone,
    subtasksTotal,
    coursesReady,
  };
}
