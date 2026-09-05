import { useMemo } from 'react';
import { COURSES } from '../data/courses';
import type { LessonKey } from '../types';
import { todayKey } from '../utils/dates';
import { parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules } from '../utils/storage';
import { accessUntilISO, formatAccessLabel, calmDaysRemaining } from '../utils/access';
import { isLessonComplete } from '../utils/progress';

interface Props {
  schedule: Record<string, string>;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
}

export function UpcomingView({ schedule, onOpen }: Props) {
  const today = todayKey();

  const upcomingLessons = useMemo(() => {
    const items: {
      key: LessonKey;
      date: string;
      title: string;
      courseTitle: string;
      label: string;
      done: boolean;
    }[] = [];
    for (const [key, date] of Object.entries(schedule)) {
      if (date < today) continue;
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
        date,
        title: lesson.title,
        courseTitle: course.title,
        label: lessonNumberLabel(mod, lesson),
        done: isLessonComplete(lesson),
      });
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [schedule, today]);

  const deadlines = useMemo(() => {
    return COURSES.map((c) => {
      const until = accessUntilISO(c.id);
      if (!until) return null;
      return {
        id: c.id,
        title: c.title,
        label: formatAccessLabel(c.id)!,
        days: calmDaysRemaining(c.id),
        until,
      };
    })
      .filter(Boolean)
      .sort((a, b) => a!.until.localeCompare(b!.until)) as {
      id: string;
      title: string;
      label: string;
      days: string | null;
      until: string;
    }[];
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof upcomingLessons>();
    for (const item of upcomingLessons) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()];
  }, [upcomingLessons]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Upcoming
        </p>
        <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">What’s ahead</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Scheduled lessons and access windows — no pressure, just visibility.
        </p>
      </header>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Scheduled lessons</h2>
        {byDate.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            No upcoming dates yet. Use Calendar to gently place a few lessons on the map.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {byDate.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  {date === today
                    ? 'Today'
                    : new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                </p>
                <ul className="mt-2 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.key}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/60"
                    >
                      <div>
                        <p className="text-xs text-orange-600 dark:text-orange-300">{item.label}</p>
                        <p
                          className={`text-sm font-medium ${
                            item.done
                              ? 'text-stone-400 line-through'
                              : 'text-stone-800 dark:text-stone-100'
                          }`}
                        >
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
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Access windows</h2>
        <ul className="mt-3 space-y-2">
          {deadlines.slice(0, 8).map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-orange-50/50 px-3 py-2 text-sm dark:bg-orange-950/20"
            >
              <span className="font-medium text-stone-700 dark:text-stone-200">{d.title}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {d.label}
                {d.days ? ` · ${d.days}` : ''}
              </span>
            </li>
          ))}
          <li className="px-1 pt-1 text-xs text-stone-400">
            No deadline (open-ended): Core Design Skills, Freelancing, Webflow Masterclass / Pro, and
            Web Design: Becoming a Professional.
          </li>
        </ul>
      </div>
    </section>
  );
}
