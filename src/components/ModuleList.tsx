import { useState } from 'react';
import type { Module } from '../types';
import { ProgressBar } from './ProgressBar';
import { isLessonComplete, lessonProgress, moduleProgress } from '../utils/progress';

interface Props {
  modules: Module[];
  hideCompleted: boolean;
  onOpenLesson: (moduleId: string, lessonId: string) => void;
}

export function ModuleList({ modules, hideCompleted, onOpenLesson }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(['m1']));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleModules = hideCompleted
    ? modules.filter((m) => moduleProgress(m).lessonsDone < m.lessons.length)
    : modules;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Modules</h2>
      <div className="space-y-3">
        {visibleModules.map((mod) => {
          const mp = moduleProgress(mod);
          const open = openIds.has(mod.id);
          const lessons = hideCompleted
            ? mod.lessons.filter((l) => !isLessonComplete(l))
            : mod.lessons;

          return (
            <div key={mod.id} className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => toggle(mod.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-stone-50/80 dark:hover:bg-stone-800/50 sm:px-5"
                aria-expanded={open}
              >
                <span
                  className={`mt-1 text-stone-400 transition ${open ? 'rotate-90' : ''}`}
                  aria-hidden
                >
                  ›
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                      Module {mod.number}
                    </span>
                    {mp.lessonsDone === mod.lessons.length && (
                      <span className="rounded-full bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-xs text-orange-700 dark:text-orange-300">Complete</span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold text-stone-800 dark:text-stone-100">{mod.title}</h3>
                  <p className="mt-1 text-xs text-stone-400">
                    {mp.lessonsDone}/{mod.lessons.length} lessons · {mp.pct}% of tasks
                  </p>
                  <div className="mt-2">
                    <ProgressBar pct={mp.pct} size="sm" />
                  </div>
                </div>
              </button>

              {open && (
                <ul className="border-t border-stone-50 bg-stone-50/40 dark:border-stone-800 dark:bg-stone-950/40 px-2 py-2 sm:px-3">
                  {lessons.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-stone-400">All lessons here are complete. Nice.</li>
                  ) : (
                    lessons.map((lesson, lessonIdx) => {
                      const lp = lessonProgress(lesson);
                      const done = isLessonComplete(lesson);
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => onOpenLesson(mod.id, lesson.id)}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white dark:hover:bg-stone-800"
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                                done
                                  ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                                  : lp.pct > 0
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                    : 'bg-stone-100 text-stone-400'
                              }`}
                            >
                              {done ? '✓' : lp.pct > 0 ? '·' : '○'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-orange-600 dark:text-orange-300">
                                Module {mod.number} · Lesson {lessonIdx + 1}
                              </p>
                              <p className={`truncate text-sm font-medium ${done ? 'text-stone-400' : 'text-stone-700 dark:text-stone-200'}`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-stone-400">
                                {lesson.duration} · {lp.done}/{lp.total} tasks
                              </p>
                            </div>
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-300">{lp.pct}%</span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
