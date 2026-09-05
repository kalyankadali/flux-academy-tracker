import { COURSES } from '../data/courses';
import { LEARNING_PATH_GROUPS } from '../utils/learningPath';
import { overallProgress } from '../utils/progress';
import { peekCourseModules } from '../utils/storage';

interface Props {
  pinnedCourseId: string | null;
  onOpenCourse: (id: string) => void;
}

export function LearningPath({ pinnedCourseId, onOpenCourse }: Props) {
  return (
    <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Recommended path</h2>
      <p className="mt-1 text-xs text-stone-400">A calm order — skip around whenever you like.</p>
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
