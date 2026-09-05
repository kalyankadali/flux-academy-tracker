import { useEffect, useMemo, useState } from 'react';
import type { CourseData, Lesson, LessonKey, Module, Subtask } from '../types';
import { ProgressBar } from './ProgressBar';
import { Description } from '../utils/linkify';
import { elapsedMinutes, formatMinutes } from '../utils/dates';
import { lessonProgress } from '../utils/progress';
import { classifySubtask, kindLabel } from '../utils/subtaskKind';
import { fluxLessonUrl } from '../utils/fluxUrl';
import { makeLessonKey } from '../utils/lessonKeys';

interface Props {
  course: CourseData;
  module: Module;
  lesson: Lesson;
  pinnedLessonKey: LessonKey | null;
  onPinLesson: (key: LessonKey | null) => void;
  onBack: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onStartTimer: (subtaskId: string) => void;
  onStopTimer: (subtaskId: string) => void;
  onSetActual: (subtaskId: string, minutes: number | null) => void;
  deferPractice?: boolean;
}

export function LessonDetail({
  course,
  module,
  lesson,
  pinnedLessonKey,
  onPinLesson,
  onBack,
  onToggleSubtask,
  onStartTimer,
  onStopTimer,
  onSetActual,
  deferPractice = false,
}: Props) {
  const lp = lessonProgress(lesson);
  const lessonNum = module.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const [, tick] = useState(0);
  const lessonKey = makeLessonKey(course.id, module.id, lesson.id);
  const isBoss = pinnedLessonKey === lessonKey;
  const fluxUrl = fluxLessonUrl(course, lesson);

  const watchDone = lesson.subtasks.some(
    (s) => classifySubtask(s) === 'watch' && s.completed,
  );

  const currentSub = useMemo(
    () => lesson.subtasks.find((s) => !s.completed) ?? lesson.subtasks[lesson.subtasks.length - 1],
    [lesson.subtasks],
  );

  const runningSub = lesson.subtasks.find((s) => s.timerStartedAt);

  useEffect(() => {
    const running = lesson.subtasks.some((s) => s.timerStartedAt);
    if (!running) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lesson.subtasks]);

  return (
    <section className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        >
          ← Back to Today
        </button>
        <div className="flex flex-wrap gap-2">
          <a
            href={fluxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
          >
            Open in Flux
          </a>
          <button
            type="button"
            onClick={() => onPinLesson(isBoss ? null : lessonKey)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium ring-1 transition ${
              isBoss
                ? 'bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-800'
                : 'bg-white text-stone-600 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700'
            }`}
          >
            {isBoss ? '★ Boss lesson' : 'Pin boss lesson'}
          </button>
        </div>
      </div>

      <header className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Module {module.number} · Lesson {lessonNum || 1}
        </p>
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{module.title}</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-800 dark:text-stone-100">{lesson.title}</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Video {lesson.duration} · ~{lesson.durationMinutes} min watch
        </p>
        <div className="mt-4">
          <ProgressBar pct={lp.pct} size="md" label={`${lp.done} of ${lp.total} tasks`} />
        </div>
        {lesson.completed && (
          <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            Lesson complete — well done. Soft celebrate.
          </p>
        )}
      </header>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {watchDone ? (
          <>
            <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">About this lesson</h2>
            <Description text={lesson.description} />
          </>
        ) : (
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold text-stone-600 dark:text-stone-300">
              Resources when ready
              <span className="ml-2 text-xs font-normal text-stone-400">
                (opens after Watch is checked)
              </span>
            </summary>
            <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
              Finish the Watch step first — resources stay tucked so focus stays calm.
            </p>
          </details>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Subtasks</h2>
        {lesson.subtasks.map((sub) => {
          const kind = classifySubtask(sub);
          if (deferPractice && kind === 'practice' && !sub.completed) {
            return (
              <div
                key={sub.id}
                className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-900/50"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-stone-400">Practice · deferred</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{sub.label}</p>
                <button
                  type="button"
                  onClick={() => onToggleSubtask(sub.id)}
                  className="mt-2 text-xs text-orange-600 underline dark:text-orange-300"
                >
                  Do practice now
                </button>
              </div>
            );
          }
          return (
            <SubtaskCard
              key={sub.id}
              sub={sub}
              showResource={watchDone || kind === 'watch'}
              onToggle={() => onToggleSubtask(sub.id)}
              onStart={() => onStartTimer(sub.id)}
              onStop={() => onStopTimer(sub.id)}
              onSetActual={(mins) => onSetActual(sub.id, mins)}
            />
          );
        })}
      </div>

      {/* Sticky focus bar */}
      {currentSub && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-stone-700 dark:bg-stone-950/95">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleSubtask(currentSub.id)}
              aria-pressed={currentSub.completed}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition ${
                currentSub.completed
                  ? 'border-orange-400 bg-orange-400 text-white'
                  : 'border-stone-300 bg-white text-transparent hover:border-orange-300 dark:border-stone-600 dark:bg-stone-900'
              }`}
            >
              ✓
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                {currentSub.label}
              </p>
              <p className="text-xs text-stone-400">
                {runningSub
                  ? `Timing… ${Math.floor(elapsedMinutes(runningSub.timerStartedAt!))}m`
                  : `Est ${formatMinutes(currentSub.estimatedMinutes)}`}
              </p>
            </div>
            {runningSub ? (
              <button
                type="button"
                onClick={() => onStopTimer(runningSub.id)}
                className="rounded-xl bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-800 dark:bg-orange-950/60 dark:text-orange-200"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartTimer(currentSub.id)}
                disabled={currentSub.completed}
                className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                Timer
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SubtaskCard({
  sub,
  showResource,
  onToggle,
  onStart,
  onStop,
  onSetActual,
}: {
  sub: Subtask;
  showResource: boolean;
  onToggle: () => void;
  onStart: () => void;
  onStop: () => void;
  onSetActual: (minutes: number | null) => void;
}) {
  const running = !!sub.timerStartedAt;
  const liveElapsed = running && sub.timerStartedAt ? elapsedMinutes(sub.timerStartedAt) : 0;
  const displayActual = sub.actualMinutes ?? (running ? Math.round(liveElapsed) : null);
  const overEstimate = displayActual != null && displayActual > sub.estimatedMinutes;
  const kind = classifySubtask(sub);

  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm transition ${
        sub.completed
          ? 'border-orange-100 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/40'
          : 'border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={sub.completed}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-sm transition ${
            sub.completed
              ? 'border-orange-400 bg-orange-400 text-white'
              : 'border-stone-200 bg-white text-transparent hover:border-orange-300 dark:border-stone-600 dark:bg-stone-950'
          }`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {kindLabel(kind)}
              </span>
            </div>
            <p
              className={`text-sm font-medium ${
                sub.completed
                  ? 'text-stone-500 line-through dark:text-stone-500'
                  : 'text-stone-800 dark:text-stone-100'
              }`}
            >
              {sub.label}
            </p>
            {sub.url && showResource && (
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block break-all text-xs text-orange-600 underline decoration-sky-200 underline-offset-2 dark:text-orange-300"
              >
                Open resource
              </a>
            )}
            {sub.url && !showResource && (
              <p className="mt-1 text-xs text-stone-400">Resource tucked until Watch is done</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="rounded-full bg-stone-50 px-2.5 py-1 dark:bg-stone-800">
              Est {formatMinutes(sub.estimatedMinutes)}
            </span>
            <span className="rounded-full bg-stone-50 px-2.5 py-1 dark:bg-stone-800">
              Actual {formatMinutes(displayActual)}
              {running ? ' (timing…)' : ''}
            </span>
            {overEstimate && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Took a little longer — still counts
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={onStop}
                className="rounded-xl bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-200"
              >
                Stop timer ({Math.floor(liveElapsed)}m{' '}
                {String(Math.floor((liveElapsed % 1) * 60)).padStart(2, '0')}s)
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                disabled={sub.completed}
                className="rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-40 dark:bg-orange-950/40 dark:text-orange-200"
              >
                Start timer
              </button>
            )}

            <label className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              Manual min
              <input
                type="number"
                min={0}
                step={1}
                value={sub.actualMinutes ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  onSetActual(v === '' ? null : Math.max(0, Number(v)));
                }}
                className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-stone-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-200 dark:focus:border-orange-600 dark:focus:ring-orange-900"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
