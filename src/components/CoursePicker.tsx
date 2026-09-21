import { useMemo } from 'react';
import { COURSES } from '../data/courses';
import { overallProgress } from '../utils/progress';
import { peekCourseModules } from '../utils/storage';
import { formatAccessLabel, calmDaysRemaining } from '../utils/access';
import { ProgressBar } from './ProgressBar';
import { DoThisNext } from './DoThisNext';
import { PlanGenerateControl } from './PlanGenerateControl';
import { LearningPath } from './LearningPath';
import { quoteForToday } from '../utils/quotes';
import { aggregateLearningPathPct } from '../utils/pathProgress';
import type { LessonKey, QueueBatch } from '../types';

interface Props {
  onSelect: (courseId: string) => void;
  pinnedCourseId: string | null;
  onPin: (courseId: string) => void;
  showAll: boolean;
  onShowAll: (v: boolean) => void;
  visibleIds: string[];
  queue: QueueBatch;
  onOpenLesson: (courseId: string, moduleId: string, lessonId: string) => void;
  onTickQueue: (key: LessonKey) => void;
  onGeneratePlan: () => void;
  hasPlan: boolean;
}

export function CoursePicker({
  onSelect,
  pinnedCourseId,
  onPin,
  showAll,
  onShowAll,
  visibleIds,
  queue,
  onOpenLesson,
  onTickQueue,
  onGeneratePlan,
  hasPlan,
}: Props) {
  const cards = useMemo(
    () =>
      COURSES.map((course) => {
        const modules = peekCourseModules(course.id, course.modules);
        const stats = overallProgress(modules);
        const comingSoon = !!course.comingSoon || course.modules.length === 0;
        const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
        return { course, stats, comingSoon, lessonCount };
      }),
    [],
  );

  const shown = [...(showAll ? cards : cards.filter((c) => visibleIds.includes(c.course.id)))].sort(
    (a, b) => {
      if (a.course.id === pinnedCourseId) return -1;
      if (b.course.id === pinnedCourseId) return 1;
      return visibleIds.indexOf(a.course.id) - visibleIds.indexOf(b.course.id);
    },
  );

  const readyCount = cards.filter((c) => !c.comingSoon).length;
  const quote = quoteForToday();
  const pathPct = useMemo(() => aggregateLearningPathPct(COURSES), []);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Flux Academy Tracker
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 sm:text-3xl">
          Your calm focus
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          A few courses up front. Pin one as your home base. Progress stays on this device — Sync
          when you switch machines.
          {readyCount < cards.length
            ? ` ${readyCount} ready · ${cards.length - readyCount} coming soon.`
            : ` ${readyCount} courses ready.`}
        </p>
      </header>

      <div className="rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4 dark:border-orange-900/40 dark:bg-orange-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
              Learning path
            </p>
            <p className="text-2xl font-semibold text-stone-800 dark:text-stone-100">{pathPct.pct}%</p>
            <p className="text-xs text-stone-400">Core path progress (coming-soon courses count once seeded)</p>
          </div>
          <PlanGenerateControl hasPlan={hasPlan} onGenerate={onGeneratePlan} />
        </div>
      </div>

      <DoThisNext queue={queue} onOpen={onOpenLesson} onTick={onTickQueue} />

      <blockquote className="rounded-3xl border border-stone-100 bg-white/80 px-5 py-4 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-base italic text-stone-600 dark:text-stone-300">“{quote.text}”</p>
        {quote.plain && (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{quote.plain}</p>
        )}
        <p className="mt-2 text-xs text-stone-400">Today’s reminder</p>
      </blockquote>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Courses</h2>
        <button
          type="button"
          onClick={() => onShowAll(!showAll)}
          className="rounded-2xl px-3 py-1.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-50 dark:text-orange-300 dark:ring-orange-800 dark:hover:bg-orange-950/40"
        >
          {showAll ? 'Show fewer' : 'Show all courses'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map(({ course, stats, comingSoon, lessonCount }) => {
          const pinned = pinnedCourseId === course.id;
          const access = formatAccessLabel(course.id);
          const days = calmDaysRemaining(course.id);
          return (
            <div
              key={course.id}
              className={`rounded-3xl border bg-white p-5 shadow-sm transition dark:bg-stone-900 ${
                pinned
                  ? 'border-orange-300 dark:border-orange-700'
                  : 'border-stone-100 dark:border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onSelect(course.id)} className="min-w-0 text-left">
                  <h2 className="text-base font-semibold text-stone-800 hover:text-orange-700 dark:text-stone-100 dark:hover:text-orange-300">
                    {course.title}
                  </h2>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPin(course.id)}
                    className={`rounded-full px-2 py-0.5 text-sm transition ${
                      pinned
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200'
                        : 'bg-stone-50 text-stone-400 hover:text-orange-500 dark:bg-stone-800'
                    }`}
                    title={pinned ? 'Unpin' : 'Pin as primary focus'}
                    aria-label={pinned ? 'Unpin course' : 'Pin course'}
                  >
                    {pinned ? '★' : '☆'}
                  </button>
                  {comingSoon ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Soon
                    </span>
                  ) : (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {access && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {access}
                  {days ? ` · ${days}` : ''}
                </p>
              )}
              {!access && (
                <p className="mt-2 text-xs text-stone-400">No access deadline · learn at your pace</p>
              )}

              {comingSoon ? (
                <p className="mt-3 text-sm text-stone-400">
                  {course.id === 'ecommerce-ai-sprint'
                    ? 'Coming soon · curriculum seed pending.'
                    : 'Curriculum seed pending.'}
                </p>
              ) : (
                <button type="button" onClick={() => onSelect(course.id)} className="mt-3 w-full space-y-2 text-left">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-orange-700 dark:text-orange-300">{stats.pct}%</span>
                    <span className="text-xs text-stone-400">
                      {stats.lessonsDone}/{lessonCount || stats.lessonsTotal} lessons
                    </span>
                  </div>
                  <ProgressBar pct={stats.pct} size="sm" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <LearningPath pinnedCourseId={pinnedCourseId} onOpenCourse={onSelect} />
    </section>
  );
}
