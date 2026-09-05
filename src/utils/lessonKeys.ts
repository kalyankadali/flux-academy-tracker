import type { CourseData, Lesson, LessonKey, Module, QueueItem } from '../types';
import { isLessonComplete } from './progress';

export function makeLessonKey(courseId: string, moduleId: string, lessonId: string): LessonKey {
  return `${courseId}::${moduleId}::${lessonId}`;
}

export function parseLessonKey(key: LessonKey): {
  courseId: string;
  moduleId: string;
  lessonId: string;
} | null {
  const parts = key.split('::');
  if (parts.length !== 3) return null;
  return { courseId: parts[0], moduleId: parts[1], lessonId: parts[2] };
}

export function lessonNumberLabel(mod: Module, lesson: Lesson): string {
  const idx = mod.lessons.findIndex((l) => l.id === lesson.id);
  const n = idx >= 0 ? idx + 1 : 1;
  return `Module ${mod.number} · Lesson ${n}`;
}

export function resolveQueueItem(
  key: LessonKey,
  courses: CourseData[],
  completedKeys: LessonKey[],
): QueueItem | null {
  const parsed = parseLessonKey(key);
  if (!parsed) return null;
  const course = courses.find((c) => c.id === parsed.courseId);
  if (!course) return null;
  const mod = course.modules.find((m) => m.id === parsed.moduleId);
  const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
  if (!mod || !lesson) return null;
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lesson.id) + 1;
  return {
    key,
    courseId: course.id,
    courseTitle: course.title,
    moduleId: mod.id,
    moduleNumber: mod.number,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonIndex,
    label: `Module ${mod.number} · Lesson ${lessonIndex}`,
    completedInQueue: completedKeys.includes(key) || isLessonComplete(lesson),
  };
}

/** Flatten incomplete lessons for a course in curriculum order */
export function incompleteLessonsForCourse(course: CourseData): LessonKey[] {
  if (course.comingSoon || !course.modules.length) return [];
  const keys: LessonKey[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!isLessonComplete(lesson)) {
        keys.push(makeLessonKey(course.id, mod.id, lesson.id));
      }
    }
  }
  return keys;
}
