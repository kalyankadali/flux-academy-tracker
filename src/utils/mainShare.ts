import type { LessonKey, MainShare } from '../types';

export type ScheduledTodayItem = {
  key: LessonKey;
  title: string;
  done: boolean;
};

/**
 * Clear Home Main: first incomplete scheduled lesson for Kolkata today.
 * When every scheduled lesson is complete, keep the first with done=true.
 * Sprint / empty day → null.
 */
export function computeMainShare(
  scheduledToday: ScheduledTodayItem[],
  dateISO: string,
  opts?: { clearDay?: boolean },
): MainShare | null {
  if (opts?.clearDay) return null;
  if (!scheduledToday.length) return null;
  const incomplete = scheduledToday.find((i) => !i.done);
  if (incomplete) {
    return {
      dateISO,
      lessonKey: incomplete.key,
      title: incomplete.title,
      done: false,
    };
  }
  const first = scheduledToday[0];
  return {
    dateISO,
    lessonKey: first.key,
    title: first.title,
    done: true,
  };
}

export function mainShareEquals(a: MainShare | null, b: MainShare | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.dateISO === b.dateISO &&
    a.lessonKey === b.lessonKey &&
    a.title === b.title &&
    a.done === b.done
  );
}
