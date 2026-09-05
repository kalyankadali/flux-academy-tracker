import { useMemo, useState } from 'react';
import { COURSES } from '../data/courses';
import type { LessonKey } from '../types';
import { todayKeyKolkata, isEcommerceFocusClearDay } from '../utils/dates';
import { makeLessonKey, parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules } from '../utils/storage';
import { isLessonComplete } from '../utils/progress';
import { LEARNING_PATH_IDS } from '../utils/learningPath';

interface Props {
  schedule: Record<string, string>;
  pinnedCourseId: string | null;
  onSchedule: (key: LessonKey, date: string | null) => void;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function CalendarView({ schedule, pinnedCourseId, onSchedule, onOpen }: Props) {
  const today = todayKeyKolkata();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(today);
  const [pickCourseId, setPickCourseId] = useState(
    pinnedCourseId || LEARNING_PATH_IDS[0] || COURSES[0]?.id || '',
  );

  const dotsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const date of Object.values(schedule)) {
      map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [schedule]);

  const dayCount = daysInMonth(cursor.y, cursor.m);
  const firstDow = new Date(cursor.y, cursor.m, 1).getDay(); // 0 Sun
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ];

  const itemsOnSelected = useMemo(() => {
    const out: { key: LessonKey; title: string; label: string; courseTitle: string; done: boolean }[] =
      [];
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== selectedDate) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson) continue;
      out.push({
        key,
        title: lesson.title,
        label: lessonNumberLabel(mod, lesson),
        courseTitle: course.title,
        done: isLessonComplete(lesson),
      });
    }
    return out;
  }, [schedule, selectedDate]);

  const assignableLessons = useMemo(() => {
    const course = COURSES.find((c) => c.id === pickCourseId);
    if (!course) return [];
    const modules = peekCourseModules(course.id, course.modules);
    const list: { key: LessonKey; label: string; title: string; done: boolean }[] = [];
    for (const mod of modules) {
      mod.lessons.forEach((lesson, idx) => {
        list.push({
          key: makeLessonKey(course.id, mod.id, lesson.id),
          label: `Module ${mod.number} · Lesson ${idx + 1}`,
          title: lesson.title,
          done: isLessonComplete(lesson),
        });
      });
    }
    return list.filter((l) => !l.done).slice(0, 40);
  }, [pickCourseId]);

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Calendar
        </p>
        <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">Plan gently</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Assign a target date to a lesson. Dots show days with plans — nothing here is a deadline guilt trip.
        </p>
      </header>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="rounded-xl px-2 py-1 text-sm text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.y, c.m - 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })
            }
          >
            ←
          </button>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{monthLabel}</h2>
          <button
            type="button"
            className="rounded-xl px-2 py-1 text-sm text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.y, c.m + 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })
            }
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-stone-400">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day == null) return <div key={`e-${i}`} />;
            const iso = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = dotsByDay.get(iso) ?? 0;
            const isToday = iso === today;
            const selected = iso === selectedDate;
            const focusClear = isEcommerceFocusClearDay(iso);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                title={focusClear ? 'Ecommerce AI Sprint focus — plan stays clear' : undefined}
                className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition ${
                  selected
                    ? 'bg-orange-500 text-white'
                    : isToday
                      ? 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200'
                      : focusClear
                        ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
                        : 'text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800'
                }`}
              >
                {day}
                {count > 0 && (
                  <span
                    className={`mt-0.5 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-orange-400'}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          On{' '}
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </h2>
        {isEcommerceFocusClearDay(selectedDate) && (
          <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
            Ecommerce AI Sprint focus day — the 40-day plan keeps this date clear on purpose.
          </p>
        )}
        {itemsOnSelected.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            {isEcommerceFocusClearDay(selectedDate)
              ? 'Intentionally clear for the live sprint.'
              : 'No lessons on this day yet.'}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {itemsOnSelected.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60"
              >
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{item.label}</p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{item.title}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseLessonKey(item.key)!;
                      onOpen(p.courseId, p.moduleId, p.lessonId);
                    }}
                    className="rounded-xl bg-orange-500 px-2.5 py-1 text-xs text-white"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => onSchedule(item.key, null)}
                    className="rounded-xl px-2.5 py-1 text-xs text-stone-500 ring-1 ring-stone-200 dark:ring-stone-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
          <label className="text-xs font-medium text-stone-500">
            Add a lesson to this day
            <select
              value={pickCourseId}
              onChange={(e) => setPickCourseId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            >
              {COURSES.filter((c) => !c.comingSoon && c.modules.length).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
            {assignableLessons.map((l) => (
              <li key={l.key}>
                <button
                  type="button"
                  onClick={() => onSchedule(l.key, selectedDate)}
                  className="flex w-full items-start justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  <span>
                    <span className="block text-xs text-orange-600 dark:text-orange-300">{l.label}</span>
                    <span className="text-stone-700 dark:text-stone-200">{l.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-orange-500">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
