import type { CourseData, Lesson, Module } from '../types';

const COMMUNITY_HOME = 'https://community.flux-academy.com';

/** Circle lesson / section ids are numeric strings from the scrape. */
function isCircleId(id: string | undefined): boolean {
  return !!id && /^\d+$/.test(id);
}

/**
 * Real Flux / Circle deep link for a lesson when we can build one from data.
 * Prefer explicit lesson.url; then proven sections/{module}/lessons/{lesson}
 * when both ids look Circle-like; else course community URL — never invent
 * paths from synthetic ids like m1-l1.
 */
export function fluxLessonUrl(
  course: CourseData,
  lesson: Lesson,
  module?: Module,
): string {
  const explicit = (lesson as Lesson & { url?: string }).url?.trim();
  if (explicit) return explicit;

  const base = (course.url || '').replace(/\/$/, '');
  if (!base) return COMMUNITY_HOME;

  // Prefer a subtask URL that is already a Circle lesson deep-link for this lesson
  const lessonPath = `/lessons/${lesson.id}`;
  const fromSub = lesson.subtasks?.find(
    (s) =>
      !!s.url &&
      s.url.includes(base) &&
      (s.url.includes(lessonPath) ||
        s.url.endsWith(`/lessons/${encodeURIComponent(lesson.id)}`)),
  )?.url;
  if (fromSub) return fromSub;

  if (module && isCircleId(module.id) && isCircleId(lesson.id)) {
    return `${base}/sections/${module.id}/lessons/${lesson.id}`;
  }

  // Numeric lesson id alone — Circle often resolves /lessons/{id} under the course
  if (isCircleId(lesson.id)) {
    return `${base}/lessons/${lesson.id}`;
  }

  // Synthetic ids (m1-l1, etc.): course page only — do not invent /lessons/…
  return base;
}
