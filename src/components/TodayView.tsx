import { useMemo } from 'react';
import { COURSES } from '../data/courses';
import type { LessonKey, QueueBatch } from '../types';
import { todayKey, computeStreak } from '../utils/dates';
import { parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules, loadCourseState } from '../utils/storage';
import { collectNextLessonKeys } from '../utils/queue';
import { DoThisNext } from './DoThisNext';
import { isLessonComplete } from '../utils/progress';

interface Props {
  schedule: Record<string, string>;
  queue: QueueBatch;
  pinnedCourseId: string | null;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
  onTickQueue: (key: LessonKey) => void;
  onSchedule: (key: LessonKey, date: string | null) => void;
}

export function TodayView({
  schedule,
  queue,
  pinnedCourseId,
  onOpen,
  onTickQueue,
  onSchedule,
}: Props) {
  const today = todayKey();

  const scheduledToday = useMemo(() => {
    const items: { key: LessonKey; title: string; courseTitle: string; label: string; done: boolean }[] = [];
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== today) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson) continue;
      items.push({
        key,
        title: lesson.title,
        courseTitle: course.title,
        label: lessonNumberLabel(mod, lesson),
        done: isLessonComplete(lesson),
      });
    }
    return items;
  }, [schedule, today]);

  const suggestions = useMemo(() => {
    if (scheduledToday.length) return [];
    return collectNextLessonKeys(COURSES, pinnedCourseId, 3).map((key) => {
      const parsed = parseLessonKey(key)!;
      const course = COURSES.find((c) => c.id === parsed.courseId)!;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId)!;
      const lesson = mod.lessons.find((l) => l.id === parsed.lessonId)!;
      return {
        key,
        title: lesson.title,
        courseTitle: course.title,
        label: lessonNumberLabel(mod, lesson),
      };
    });
  }, [scheduledToday.length, pinnedCourseId]);

  const streak = useMemo(() => {
    // Aggregate streaks across courses — union of streak dates
    const dates = new Set<string>();
    for (const c of COURSES) {
      const state = loadCourseState(c.id, c.modules);
      for (const d of state.streakDates) dates.add(d);
    }
    return computeStreak([...dates]);
  }, []);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Today
        </p>
        <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {streak === 0
            ? 'A soft start is still a start — one task lights the streak.'
            : `${streak}-day streak · showing up is enough.`}
        </p>
      </header>

      <DoThisNext queue={queue} onOpen={onOpen} onTick={onTickQueue} />

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Scheduled for today</h2>
        {scheduledToday.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            Nothing dated for today yet. You can assign dates in Calendar, or try the suggestions below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scheduledToday.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-orange-50/60 px-3 py-2.5 dark:bg-orange-950/30"
              >
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{item.label}</p>
                  <p className={`text-sm font-medium ${item.done ? 'text-stone-400 line-through' : 'text-stone-800 dark:text-stone-100'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-stone-400">{item.courseTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const p = parseLessonKey(item.key)!;
                    onOpen(p.courseId, p.moduleId, p.lessonId);
                  }}
                  className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Gentle planner suggestions
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            From your pinned course / learning path — schedule any that feel good.
          </p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5 dark:bg-stone-800"
              >
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{s.label}</p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{s.title}</p>
                  <p className="text-xs text-stone-400">{s.courseTitle}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSchedule(s.key, today)}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-stone-900 dark:text-orange-300 dark:ring-orange-800"
                  >
                    Schedule today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseLessonKey(s.key)!;
                      onOpen(p.courseId, p.moduleId, p.lessonId);
                    }}
                    className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
}
