import { useMemo } from 'react';
import { COURSES } from '../data/courses';
import { LEARNING_PATH_GROUPS, AGGREGATE_PATH_EXCLUDE } from '../utils/learningPath';
import { overallProgress } from '../utils/progress';
import { peekCourseModules } from '../utils/storage';
import { aggregateLearningPathPct } from '../utils/pathProgress';
import { ProgressBar } from './ProgressBar';

interface Props {
  pinnedCourseId: string | null;
  onOpenCourse: (id: string) => void;
}

export function LearningPath({ pinnedCourseId, onOpenCourse }: Props) {
  const agg = useMemo(() => aggregateLearningPathPct(COURSES), []);

  return (
    <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Recommended path</h2>
          <p className="mt-1 text-xs text-stone-400">A calm order — skip around whenever you like.</p>
        </div>
        <div className="min-w-[140px] text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
            Learning path
          </p>
          <p className="text-2xl font-semibold text-stone-800 dark:text-stone-100">{agg.pct}%</p>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar pct={agg.pct} size="sm" label={`${agg.subtasksDone}/${agg.subtasksTotal} tasks on core path`} />
      </div>
      <p className="mt-2 text-[11px] text-stone-400">
        Aggregate excludes Becoming a Professional, Freelancing, and Webflow (still listed below).
      </p>
      <ol className="mt-4 space-y-4">
        {LEARNING_PATH_GROUPS.map((group) => (
          <li key={group.title}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-orange-600/80 dark:text-orange-300/80">
              {group.title}
            </p>
            <ul className="space-y-2">
              {group.ids.map((id) => {
                const course = COURSES.find((c) => c.id === id);
                if (!course) return null;
                const modules = peekCourseModules(course.id, course.modules);
                const stats = overallProgress(modules);
                const pinned = pinnedCourseId === id;
                const ready = !course.comingSoon && course.modules.length > 0;
                const excluded = AGGREGATE_PATH_EXCLUDE.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onOpenCourse(id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition ${
                      pinned
                        ? 'bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:ring-orange-800'
                        : 'bg-stone-50 hover:bg-orange-50/60 dark:bg-stone-800/50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                        {pinned ? '★ ' : ''}
                        {course.title}
                        {excluded ? ' · later' : ''}
                      </span>
                      <span className="text-xs text-stone-400">
                        {ready ? `${stats.pct}% · ${stats.lessonsDone}/${stats.lessonsTotal} lessons` : 'Coming soon'}
                      </span>
                    </span>
                    <span className="text-xs text-orange-500">Open</span>
                  </button>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
