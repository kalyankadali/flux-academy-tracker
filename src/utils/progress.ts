import type { Lesson, Module, Subtask } from '../types';

export function lessonProgress(lesson: Lesson): { done: number; total: number; pct: number } {
  const total = lesson.subtasks.length;
  const done = lesson.subtasks.filter((s) => s.completed).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function moduleProgress(mod: Module): { done: number; total: number; pct: number; lessonsDone: number } {
  const lessons = mod.lessons;
  const lessonsDone = lessons.filter((l) => l.completed || lessonProgress(l).pct === 100).length;
  let done = 0;
  let total = 0;
  for (const l of lessons) {
    const p = lessonProgress(l);
    done += p.done;
    total += p.total;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, lessonsDone };
}

export function overallProgress(modules: Module[]): {
  pct: number;
  lessonsDone: number;
  lessonsTotal: number;
  modulesComplete: number;
  modulesTotal: number;
  subtasksDone: number;
  subtasksTotal: number;
} {
  let lessonsDone = 0;
  let lessonsTotal = 0;
  let modulesComplete = 0;
  let subtasksDone = 0;
  let subtasksTotal = 0;
  for (const m of modules) {
    lessonsTotal += m.lessons.length;
    const mp = moduleProgress(m);
    lessonsDone += mp.lessonsDone;
    subtasksDone += mp.done;
    subtasksTotal += mp.total;
    if (mp.lessonsDone === m.lessons.length && m.lessons.length > 0) modulesComplete += 1;
  }
  return {
    pct: subtasksTotal ? Math.round((subtasksDone / subtasksTotal) * 100) : 0,
    lessonsDone,
    lessonsTotal,
    modulesComplete,
    modulesTotal: modules.length,
    subtasksDone,
    subtasksTotal,
  };
}

export function isLessonComplete(lesson: Lesson): boolean {
  return lesson.subtasks.length > 0 && lesson.subtasks.every((s) => s.completed);
}

export function findNextIncompleteLesson(modules: Module[]): { module: Module; lesson: Lesson } | null {
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (!isLessonComplete(lesson)) return { module, lesson };
    }
  }
  return null;
}

export function findSubtask(
  modules: Module[],
  lessonId: string,
  subtaskId: string,
): { module: Module; lesson: Lesson; subtask: Subtask } | null {
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (lesson.id !== lessonId) continue;
      const subtask = lesson.subtasks.find((s) => s.id === subtaskId);
      if (subtask) return { module, lesson, subtask };
    }
  }
  return null;
}
