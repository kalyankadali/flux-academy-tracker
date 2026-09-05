import type { CourseData, LessonKey, QueueBatch } from '../types';
import { LEARNING_PATH_IDS } from './learningPath';
import { incompleteLessonsForCourse } from './lessonKeys';
import { isLessonComplete } from './progress';
import { peekCourseModules } from './storage';

function courseWithProgress(seed: CourseData): CourseData {
  const modules = peekCourseModules(seed.id, seed.modules);
  return { ...seed, modules };
}

/**
 * Build next incomplete lesson keys preferring pinned course,
 * else learning-path order across ready courses.
 */
export function collectNextLessonKeys(
  courses: CourseData[],
  pinnedCourseId: string | null,
  limit: number,
  exclude: Set<LessonKey> = new Set(),
): LessonKey[] {
  const byId = new Map(courses.map((c) => [c.id, courseWithProgress(c)]));
  const out: LessonKey[] = [];

  const pushFrom = (courseId: string) => {
    const c = byId.get(courseId);
    if (!c || c.comingSoon || !c.modules.length) return;
    for (const key of incompleteLessonsForCourse(c)) {
      if (exclude.has(key) || out.includes(key)) continue;
      // re-check live completion
      out.push(key);
      if (out.length >= limit) return;
    }
  };

  if (pinnedCourseId) pushFrom(pinnedCourseId);
  if (out.length >= limit) return out;

  for (const id of LEARNING_PATH_IDS) {
    if (id === pinnedCourseId) continue;
    pushFrom(id);
    if (out.length >= limit) return out;
  }

  // Any remaining ready courses not on path
  for (const c of courses) {
    if (LEARNING_PATH_IDS.includes(c.id) || c.id === pinnedCourseId) continue;
    pushFrom(c.id);
    if (out.length >= limit) return out;
  }

  return out;
}

/** Refresh queue: keep unfinished keys, fill to 3, or replace when all done. */
export function refreshQueueBatch(
  current: QueueBatch,
  courses: CourseData[],
  pinnedCourseId: string | null,
): QueueBatch {
  const liveCourses = courses.map(courseWithProgress);

  const stillValid = (key: LessonKey): boolean => {
    const [courseId, moduleId, lessonId] = key.split('::');
    const c = liveCourses.find((x) => x.id === courseId);
    const lesson = c?.modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
    return !!lesson && !isLessonComplete(lesson);
  };

  const unfinished = current.keys.filter(
    (k) => !current.completedKeys.includes(k) && stillValid(k),
  );

  // All three ticked (or none left unfinished) → load next 3
  const allDone =
    current.keys.length > 0 &&
    current.keys.every((k) => current.completedKeys.includes(k) || !stillValid(k));

  if (allDone || current.keys.length === 0) {
    const exclude = new Set<LessonKey>([
      ...current.keys,
      ...current.completedKeys,
    ]);
    const keys = collectNextLessonKeys(liveCourses, pinnedCourseId, 3, exclude);
    // If exclude emptied the pool, try without exclude of completedKeys only
    const finalKeys =
      keys.length > 0
        ? keys
        : collectNextLessonKeys(liveCourses, pinnedCourseId, 3, new Set());
    return { keys: finalKeys, completedKeys: [] };
  }

  if (unfinished.length < 3) {
    const exclude = new Set([...current.keys, ...current.completedKeys]);
    const fill = collectNextLessonKeys(liveCourses, pinnedCourseId, 3 - unfinished.length, exclude);
    return { keys: [...unfinished, ...fill].slice(0, 3), completedKeys: [] };
  }

  return { keys: unfinished.slice(0, 3), completedKeys: current.completedKeys.filter((k) => unfinished.includes(k)) };
}

export function markQueueLessonDone(batch: QueueBatch, key: LessonKey): QueueBatch {
  if (!batch.keys.includes(key)) return batch;
  if (batch.completedKeys.includes(key)) return batch;
  return { ...batch, completedKeys: [...batch.completedKeys, key] };
}
