import type { Lesson, LessonKey, Module, QueueBatch, WinEntry } from '../types';
import { ProgressBar } from './ProgressBar';
import { EmptyState } from './EmptyState';
import { DoThisNext } from './DoThisNext';
import { quoteForToday } from '../utils/quotes';
import { formatAccessLabel, calmDaysRemaining } from '../utils/access';

type Next = { module: Module; lesson: Lesson } | null;

interface Stats {
  pct: number;
  lessonsDone: number;
  lessonsTotal: number;
  modulesComplete: number;
  modulesTotal: number;
  subtasksDone: number;
  subtasksTotal: number;
}

interface Props {
  courseId: string;
  courseTitle: string;
  courseUrl: string;
  stats: Stats;
  streak: number;
  next: Next;
  todayWins: WinEntry[];
  queue: QueueBatch;
  onOpenLesson: (moduleId: string, lessonId: string) => void;
  onOpenQueueLesson: (courseId: string, moduleId: string, lessonId: string) => void;
  onTickQueue: (key: LessonKey) => void;
}

export function Dashboard({
  courseId,
  courseTitle,
  courseUrl,
  stats,
  streak,
  next,
  todayWins,
  queue,
  onOpenLesson,
  onOpenQueueLesson,
  onTickQueue,
}: Props) {
  const isEmpty = stats.subtasksDone === 0;
  const quote = quoteForToday();
  const access = formatAccessLabel(courseId);
  const days = calmDaysRemaining(courseId);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Flux Academy Tracker
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 sm:text-3xl">
          {courseTitle}
        </h1>
        <a
          href={courseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm text-orange-600 underline decoration-orange-200 underline-offset-2 hover:text-orange-700 dark:text-orange-300"
        >
          Open course on Flux Academy
        </a>
        {access && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {access}
            {days ? ` · ${days}` : ''}
          </p>
        )}
      </header>

      {isEmpty ? (
        <EmptyState
          onStart={() => {
            if (next) onOpenLesson(next.module.id, next.lesson.id);
          }}
        />
      ) : (
        <div className="rounded-3xl border border-orange-100/80 bg-white p-5 shadow-sm dark:border-orange-900/40 dark:bg-stone-900 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">Overall progress</p>
              <p className="text-3xl font-semibold text-orange-600 dark:text-orange-300">{stats.pct}%</p>
            </div>
            <p className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
              {stats.lessonsDone}/{stats.lessonsTotal} lessons · {stats.modulesComplete}/
              {stats.modulesTotal} modules
            </p>
          </div>
          <ProgressBar pct={stats.pct} size="lg" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          emoji="🔥"
          title="Streak"
          value={streak === 0 ? 'Start today' : `${streak} day${streak === 1 ? '' : 's'}`}
          hint={streak === 0 ? 'One subtask starts a streak' : 'Showing up adds up'}
        />
        <StatCard
          emoji="✅"
          title="Lessons done"
          value={`${stats.lessonsDone} / ${stats.lessonsTotal}`}
          hint="Every finished lesson is a win"
        />
        <StatCard
          emoji="📦"
          title="Modules complete"
          value={`${stats.modulesComplete} / ${stats.modulesTotal}`}
          hint="Celebrate module finishes"
        />
      </div>

      <DoThisNext
        queue={queue}
        multiCourse
        onOpen={onOpenQueueLesson}
        onTick={onTickQueue}
      />

      <blockquote className="rounded-3xl border border-stone-100 bg-white/80 px-5 py-4 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-base italic text-stone-600 dark:text-stone-300">“{quote.text}”</p>
        {quote.plain && (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{quote.plain}</p>
        )}
        <p className="mt-2 text-xs text-stone-400">Today’s reminder</p>
      </blockquote>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Today’s wins</h3>
        {todayWins.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">
            No wins logged yet today — your first checkmark will land here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todayWins.slice(0, 8).map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-2 rounded-xl bg-orange-50/60 px-3 py-2 text-sm text-stone-700 dark:bg-orange-950/30 dark:text-stone-200"
              >
                <span aria-hidden>{w.type === 'module' ? '🏆' : w.type === 'lesson' ? '📘' : '✦'}</span>
                <span className="flex-1">{w.label}</span>
                <span className="text-xs capitalize text-stone-400">{w.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatCard({
  emoji,
  title,
  value,
  hint,
}: {
  emoji: string;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <span aria-hidden>{emoji}</span>
        {title}
      </div>
      <p className="mt-2 text-xl font-semibold text-stone-800 dark:text-stone-100">{value}</p>
      <p className="mt-1 text-xs text-stone-400">{hint}</p>
    </div>
  );
}
