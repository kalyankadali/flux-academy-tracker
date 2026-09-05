import { useEffect, useState } from 'react';
import type { Lesson, Module, Subtask } from '../types';
import { ProgressBar } from './ProgressBar';
import { Description } from '../utils/linkify';
import { elapsedMinutes, formatMinutes } from '../utils/dates';
import { lessonProgress } from '../utils/progress';

interface Props {
  module: Module;
  lesson: Lesson;
  onBack: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onStartTimer: (subtaskId: string) => void;
  onStopTimer: (subtaskId: string) => void;
  onSetActual: (subtaskId: string, minutes: number | null) => void;
}

export function LessonDetail({
  module,
  lesson,
  onBack,
  onToggleSubtask,
  onStartTimer,
  onStopTimer,
  onSetActual,
}: Props) {
  const lp = lessonProgress(lesson);
  const lessonNum = module.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const [, tick] = useState(0);

  useEffect(() => {
    const running = lesson.subtasks.some((s) => s.timerStartedAt);
    if (!running) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lesson.subtasks]);

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
      >
        ← Back to overview
      </button>

      <header className="rounded-3xl border border-stone-100 bg-white dark:bg-stone-900 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Module {module.number} · Lesson {lessonNum || 1}
        </p>
        <p className="mt-1 text-xs text-stone-400">{module.title}</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-800 dark:text-stone-100">{lesson.title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          Video {lesson.duration} · ~{lesson.durationMinutes} min watch
        </p>
        <div className="mt-4">
          <ProgressBar pct={lp.pct} size="md" label={`${lp.done} of ${lp.total} tasks`} />
        </div>
        {lesson.completed && (
          <p className="mt-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
            Lesson complete — well done. Soft celebrate.
          </p>
        )}
      </header>

      <div className="rounded-3xl border border-stone-100 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">About this lesson</h2>
        <Description text={lesson.description} />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Subtasks</h2>
        {lesson.subtasks.map((sub) => (
          <SubtaskCard
            key={sub.id}
            sub={sub}
            onToggle={() => onToggleSubtask(sub.id)}
            onStart={() => onStartTimer(sub.id)}
            onStop={() => onStopTimer(sub.id)}
            onSetActual={(mins) => onSetActual(sub.id, mins)}
          />
        ))}
      </div>
    </section>
  );
}

function SubtaskCard({
  sub,
  onToggle,
  onStart,
  onStop,
  onSetActual,
}: {
  sub: Subtask;
  onToggle: () => void;
  onStart: () => void;
  onStop: () => void;
  onSetActual: (minutes: number | null) => void;
}) {
  const running = !!sub.timerStartedAt;
  const liveElapsed = running && sub.timerStartedAt ? elapsedMinutes(sub.timerStartedAt) : 0;
  const displayActual = sub.actualMinutes ?? (running ? Math.round(liveElapsed) : null);
  const overEstimate =
    displayActual != null && displayActual > sub.estimatedMinutes;

  return (
    <div
      className={`rounded-3xl border p-4 shadow-sm transition ${
        sub.completed ? 'border-orange-100 bg-orange-50 dark:bg-orange-950/40/40' : 'border-stone-100 bg-white'
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
              : 'border-stone-200 bg-white dark:bg-stone-900 text-transparent hover:border-orange-300'
          }`}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className={`text-sm font-medium ${sub.completed ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
              {sub.label}
            </p>
            {sub.url && (
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block break-all text-xs text-orange-600 underline decoration-sky-200 underline-offset-2"
              >
                Open resource
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="rounded-full bg-stone-50 px-2.5 py-1">Est {formatMinutes(sub.estimatedMinutes)}</span>
            <span className="rounded-full bg-stone-50 px-2.5 py-1">
              Actual {formatMinutes(displayActual)}
              {running ? ' (timing…)' : ''}
            </span>
            {overEstimate && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                Took a little longer — still counts
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={onStop}
                className="rounded-xl bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-200"
              >
                Stop timer ({Math.floor(liveElapsed)}m {String(Math.floor((liveElapsed % 1) * 60)).padStart(2, '0')}s)
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                disabled={sub.completed}
                className="rounded-xl bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-40"
              >
                Start timer
              </button>
            )}

            <label className="flex items-center gap-1.5 text-xs text-stone-500">
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
                className="w-16 rounded-lg border border-stone-200 bg-white dark:bg-stone-900 px-2 py-1 text-stone-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
