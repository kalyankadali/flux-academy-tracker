import type { LessonKey } from '../types';
import { parseLessonKey } from '../utils/lessonKeys';

type Item = {
  key: LessonKey;
  title: string;
  courseTitle: string;
  label: string;
  done: boolean;
  courseId: string;
  moduleId: string;
  lessonId: string;
};

type Suggestion = { key: LessonKey; title: string; courseTitle: string; label: string };

interface Props {
  sprintFocus: boolean;
  scheduledToday: Item[];
  suggestions: Suggestion[];
  today: string;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
  onSchedule: (key: LessonKey, date: string | null) => void;
}

export function TodayScheduledBlock({
  sprintFocus, scheduledToday, suggestions, today, onOpen, onSchedule,
}: Props) {
  return (
    <>
      <div className={`rounded-3xl border bg-white p-5 shadow-sm dark:bg-stone-900 dark:border-stone-800 ${sprintFocus ? 'border-stone-100 opacity-60' : 'border-stone-100'}`}>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{sprintFocus ? 'Path lessons for today (clear / optional)' : 'Scheduled for today'}</h2>
        {scheduledToday.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">{sprintFocus ? 'Nothing on the path today — that’s intentional for the live sprint.' : 'Nothing dated for today yet. Generate a 40-day plan, or try the suggestions below.'}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {scheduledToday.map((item) => (
              <li key={item.key} className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 ${sprintFocus ? 'bg-stone-50 dark:bg-stone-800/50' : 'bg-orange-50/60 dark:bg-orange-950/30'}`}>
                <div>
                  <p className={`text-xs ${sprintFocus ? 'text-stone-400' : 'text-orange-600 dark:text-orange-300'}`}>{item.label}</p>
                  <p className={`text-sm font-medium ${item.done ? 'text-stone-400 line-through' : 'text-stone-800 dark:text-stone-100'}`}>{item.title}</p>
                  <p className="text-xs text-stone-400">{item.courseTitle}</p>
                </div>
                <button type="button" onClick={() => onOpen(item.courseId, item.moduleId, item.lessonId)} className={`rounded-xl px-3 py-1.5 text-xs font-medium ${sprintFocus ? 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-200' : 'bg-orange-500 text-white'}`}>Open</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-5 dark:border-orange-900 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Gentle planner suggestions</h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2.5 dark:bg-stone-800">
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300">{s.label}</p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{s.title}</p>
                  <p className="text-xs text-stone-400">{s.courseTitle}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onSchedule(s.key, today)} className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-stone-900 dark:text-orange-300">Schedule today</button>
                  <button type="button" onClick={() => { const p = parseLessonKey(s.key)!; onOpen(p.courseId, p.moduleId, p.lessonId); }} className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white">Open</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
