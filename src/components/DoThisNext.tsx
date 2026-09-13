import { COURSES } from '../data/courses';
import type { LessonKey, QueueBatch } from '../types';
import { resolveQueueItem } from '../utils/lessonKeys';
import { peekCourseModules } from '../utils/storage';
import { THIS_OR_NOTHING } from '../utils/quotes';

interface Props {
  queue: QueueBatch;
  multiCourse?: boolean;
  /** Soften priority pressure (e.g. sprint focus week) */
  deemphasized?: boolean;
  /** Quiet this-or-nothing line under the next-lesson heading */
  binaryHint?: boolean;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
  onTick: (key: LessonKey) => void;
}

export function DoThisNext({ queue, multiCourse = true, deemphasized = false, binaryHint = false, onOpen, onTick }: Props) {
  const items = queue.keys
    .map((key) => {
      const courses = COURSES.map((c) => ({
        ...c,
        modules: peekCourseModules(c.id, c.modules),
      }));
      return resolveQueueItem(key, courses, queue.completedKeys);
    })
    .filter(Boolean);

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 text-center shadow-sm dark:border-orange-900/40 dark:from-stone-900 dark:to-stone-900">
        <p className="text-lg font-semibold text-orange-800 dark:text-orange-200">
          You’re all caught up for now.
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Soft applause — take a breath, or peek the learning path when you’re ready.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        deemphasized
          ? 'border-stone-100 bg-stone-50/60 opacity-80 dark:border-stone-800 dark:bg-stone-900/50'
          : 'border-orange-100 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/40 dark:from-stone-900 dark:bg-stone-900'
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          deemphasized
            ? 'text-stone-400 dark:text-stone-500'
            : 'text-orange-600 dark:text-orange-300'
        }`}
      >
        {deemphasized
          ? 'Path lessons (optional today)'
          : `Do this next · ${items.length} gentle priorities`}
      </p>
      {deemphasized && (
        <p className="mt-1 text-xs text-stone-400">
          No pressure — sprint week comes first. These stay available if you want a quiet lesson.
        </p>
      )}
      {binaryHint && (
        <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">{THIS_OR_NOTHING}</p>
      )}
      <ul className="mt-3 space-y-3">
        {items.map((item, i) => {
          if (!item) return null;
          const done = item.completedInQueue;
          return (
            <li
              key={item.key}
              className={`flex flex-wrap items-start gap-3 rounded-2xl border px-3 py-3 ${
                done
                  ? 'border-stone-100 bg-stone-50/80 opacity-70 dark:border-stone-800 dark:bg-stone-800/40'
                  : 'border-orange-100/80 bg-white dark:border-stone-700 dark:bg-stone-800/60'
              }`}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-900/50 dark:text-orange-200">
                {done ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-orange-600 dark:text-orange-300">{item.label}</p>
                <p className={`text-sm font-semibold ${done ? 'text-stone-400 line-through' : 'text-stone-800 dark:text-stone-100'}`}>
                  {item.lessonTitle}
                </p>
                {multiCourse && (
                  <p className="mt-0.5 text-xs text-stone-400">{item.courseTitle}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!done && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpen(item.courseId, item.moduleId, item.lessonId)}
                      className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-orange-600"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onTick(item.key)}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-600"
                      title="Mark this queue item done"
                    >
                      Tick off
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-stone-400">
        Finish these three when you can — we’ll quietly load the next set.
      </p>
    </div>
  );
}
