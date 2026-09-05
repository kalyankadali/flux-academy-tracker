import type { CourseData, Lesson } from '../types';

/**
 * Best-effort Circle deep link to a lesson.
 * Prefer course.url + /lessons/{lesson.id} when lesson id looks Circle-like;
 * otherwise fall back to the course community URL.
 */
export function fluxLessonUrl(course: CourseData, lesson: Lesson): string {
  const base = (course.url || '').replace(/\/$/, '');
  if (!base) return 'https://community.flux-academy.com';
  if (lesson.id) {
    return `${base}/lessons/${encodeURIComponent(lesson.id)}`;
  }
  return base;
}
