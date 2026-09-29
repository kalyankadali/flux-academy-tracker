import { COURSES } from '../data/courses';
import type { CourseData, LessonKey, Module } from '../types';
import { LEARNING_PATH_IDS, pathIndex } from './learningPath';
import { makeLessonKey, parseLessonKey } from './lessonKeys';
import { isLessonComplete } from './progress';
import { peekCourseModules } from './storage';

export interface LessonNavTarget {
  courseId: string;
  moduleId: string;
  lessonId: string;
  title: string;
  /** e.g. "Lesson 3 · Frames" or "Framer Masterclass · Lesson 1 · Intro" */
  label: string;
  /** Why this one: planned for today, or simply next in course order */
  source: 'today' | 'sequence';
}

type FlatLesson = {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleIdx: number;
  moduleNumber: number;
  lessonId: string;
  lessonIdx: number;
  lessonNum: number;
  title: string;
  done: boolean;
};

/** Courses in calm learning-path order (path first, then any remaining), skipping empty/coming-soon. */
function orderedCourses(): CourseData[] {
  const onPath = LEARNING_PATH_IDS.map((id) => COURSES.find((c) => c.id === id)).filter(
    (c): c is CourseData => !!c,
  );
  const rest = COURSES.filter((c) => !LEARNING_PATH_IDS.includes(c.id));
  return [...onPath, ...rest].filter((c) => !c.comingSoon && c.modules.length > 0);
}

function flatten(course: CourseData, modules: Module[]): FlatLesson[] {
  const out: FlatLesson[] = [];
  modules.forEach((m, mi) => {
    m.lessons.forEach((l, li) => {
      out.push({
        courseId: course.id,
        courseTitle: course.title,
        moduleId: m.id,
        moduleIdx: mi,
        moduleNumber: m.number,
        lessonId: l.id,
        lessonIdx: li,
        lessonNum: li + 1,
        title: l.title,
        done: isLessonComplete(l),
      });
    });
  });
  return out;
}

function toTarget(
  f: FlatLesson,
  current: { courseId: string; moduleId: string },
  source: LessonNavTarget['source'],
): LessonNavTarget {
  const base = `Lesson ${f.lessonNum} · ${f.title}`;
  let label = base;
  if (f.courseId !== current.courseId) label = `${f.courseTitle} · ${base}`;
  else if (f.moduleId !== current.moduleId) label = `Module ${f.moduleNumber} · ${base}`;
  return { courseId: f.courseId, moduleId: f.moduleId, lessonId: f.lessonId, title: f.title, label, source };
}

/**
 * Resolve Next / Previous for Focus mode.
 * Next: the next incomplete lesson planned for today (calm plan order), else the next lesson
 * in course order, rolling into the next course on the learning path. null = nothing left.
 * `liveModules` = current course's in-memory modules (fresher than localStorage).
 */
export function resolveLessonNav(opts: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  liveModules: Module[];
  schedule: Record<string, string>;
  todayDates: string[];
}): { next: LessonNavTarget | null; prev: LessonNavTarget | null } {
  const { courseId, moduleId, lessonId, liveModules, schedule, todayDates } = opts;
  const current = { courseId, moduleId };
  const courses = orderedCourses();
  const flatCache = new Map<string, FlatLesson[]>();
  const flatFor = (c: CourseData): FlatLesson[] => {
    let f = flatCache.get(c.id);
    if (!f) {
      f = flatten(c, c.id === courseId ? liveModules : peekCourseModules(c.id, c.modules));
      flatCache.set(c.id, f);
    }
    return f;
  };
  const currentKey: LessonKey = makeLessonKey(courseId, moduleId, lessonId);

  // 1) Planned-today sequence (same schedule entries Today shows), path → module → lesson order.
  const todayItems: FlatLesson[] = [];
  for (const [key, date] of Object.entries(schedule)) {
    if (!todayDates.includes(date) || key === currentKey) continue;
    const p = parseLessonKey(key);
    if (!p) continue;
    const course = courses.find((c) => c.id === p.courseId);
    if (!course) continue;
    const f = flatFor(course).find((x) => x.moduleId === p.moduleId && x.lessonId === p.lessonId);
    if (f && !f.done) todayItems.push(f);
  }
  todayItems.sort(
    (a, b) =>
      pathIndex(a.courseId) - pathIndex(b.courseId) ||
      a.moduleIdx - b.moduleIdx ||
      a.lessonIdx - b.lessonIdx,
  );
  // Prefer the planned lesson that comes after this one; else wrap to an earlier planned catch-up.
  const curCourse = courses.find((c) => c.id === courseId);
  const curPos = curCourse
    ? flatFor(curCourse).find((f) => f.moduleId === moduleId && f.lessonId === lessonId)
    : undefined;
  const cmp = (f: FlatLesson) =>
    curPos
      ? pathIndex(f.courseId) - pathIndex(courseId) ||
        f.moduleIdx - curPos.moduleIdx ||
        f.lessonIdx - curPos.lessonIdx
      : 1;
  const planned = todayItems.find((f) => cmp(f) > 0) ?? todayItems[0];
  let next: LessonNavTarget | null = planned ? toTarget(planned, current, 'today') : null;

  // 2) Sequential course order, rolling across courses on the learning path.
  let prev: LessonNavTarget | null = null;
  const ci = courses.findIndex((c) => c.id === courseId);
  if (ci >= 0) {
    const flat = flatFor(courses[ci]);
    const idx = flat.findIndex((f) => f.moduleId === moduleId && f.lessonId === lessonId);
    if (idx >= 0) {
      if (!next) {
        if (idx + 1 < flat.length) next = toTarget(flat[idx + 1], current, 'sequence');
        for (let j = ci + 1; j < courses.length && !next; j++) {
          const first = flatFor(courses[j])[0];
          if (first) next = toTarget(first, current, 'sequence');
        }
      }
      if (idx > 0) prev = toTarget(flat[idx - 1], current, 'sequence');
      for (let j = ci - 1; j >= 0 && !prev; j--) {
        const all = flatFor(courses[j]);
        if (all.length) prev = toTarget(all[all.length - 1], current, 'sequence');
      }
    }
  }
  return { next, prev };
}
