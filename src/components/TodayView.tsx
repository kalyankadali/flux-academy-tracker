import { useEffect, useMemo, useRef, useState } from 'react';
import { COURSES } from '../data/courses';
import type { AppPrefs, LessonKey, QueueBatch } from '../types';
import { todayKey, todayKeyKolkata, addDaysISO, isSunday, isoWeekKey, isEcommerceFocusClearDay } from '../utils/dates';
import { pullClearHomeDayGraph } from '../lib/appwrite';
import { clearHomeDayPulseUrl, clearHomeRecoveryUrl } from '../utils/dayGraph';
import { parseLessonKey, lessonNumberLabel } from '../utils/lessonKeys';
import { peekCourseModules, loadCourseState } from '../utils/storage';
import { collectNextLessonKeys } from '../utils/queue';
import { DoThisNext } from './DoThisNext';
import { PlanGenerateControl } from './PlanGenerateControl';
import { IpadTip } from './IpadTip'
import { InstallChecklist } from './InstallChecklist';
import { SprintWeekBanner } from './SprintWeekBanner';
import { WeeklyReviewCard } from './WeeklyReviewCard';
import { TodayCloseBlock } from './TodayCloseBlock';
import { WeekExportButton } from './WeekExportButton';
import { isLessonComplete } from '../utils/progress';
import { countDaysBehind } from '../utils/plan40';
import { canUseStreakShield } from '../utils/streakShield';
import { shouldShowSoftBanner, viewStreak } from '../utils/streak';
import { StreakStrip, StreakWeeklyStrip } from './StreakStrip';
import { StreakRing } from './StreakRing';
import { fluxWindowCopy, getFluxWindow, FLUX_DEEP_BLOCKS_HINT } from '../utils/dayWindows';
import { computeMainShare, mainShareEquals } from '../utils/mainShare';
import { LIFE_GOAL } from '../utils/calmCopy';

const SPRINT_URL = 'https://flux-academy.com/ecommerce-ai-sprint';

interface Props {
  prefs: AppPrefs;
  queue: QueueBatch;
  onOpen: (courseId: string, moduleId: string, lessonId: string) => void;
  onTickQueue: (key: LessonKey) => void;
  onSchedule: (key: LessonKey, date: string | null) => void;
  onGeneratePlan: () => void;
  onCatchUp: () => void;
  onMarkDayDone: () => void;
  onDeferPractice: (v: boolean) => void;
  onDismissWeeklyReview: () => void;
  onSaveWeeklyFocus: (note: string) => void;
  onDismissTip: () => void;
  onUseShield: (weekKey: string) => void;
  onUseFreeze?: () => void;
  onDismissStreakBanner?: () => void;
  onPatchPrefs: (partial: Partial<AppPrefs>) => void;
  /** Scroll/highlight primary (from ?main=1) */
  highlightPrimary?: boolean;
  /** Highlight a lesson key on Today (from ?lesson= when route missing) */
  highlightLessonKey?: LessonKey | null;
}

export function TodayView({
  prefs, queue, onOpen, onTickQueue, onSchedule, onGeneratePlan, onCatchUp,
  onMarkDayDone, onDeferPractice: _onDeferPractice, onDismissWeeklyReview, onSaveWeeklyFocus, onDismissTip, onUseShield,
  onUseFreeze, onDismissStreakBanner,
  onPatchPrefs, highlightPrimary = false, highlightLessonKey = null,
}: Props) {
  const today = todayKey();
  const todayIST = todayKeyKolkata();
  const weekKey = isoWeekKey();
  const sprintFocus = isEcommerceFocusClearDay(todayIST);
  const [showClose, setShowClose] = useState(false);
  /** Re-check soft evening streak nudge when the IST hour crosses 20. */
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const [focusDraft, setFocusDraft] = useState(prefs.weeklyFocusNote ?? '');
  const schedule = prefs.schedule;
  const sprintHref = COURSES.find((c) => c.id === 'ecommerce-ai-sprint')?.url || SPRINT_URL;

  const scheduledToday = useMemo(() => {
    const items: { key: LessonKey; title: string; courseTitle: string; label: string; done: boolean; courseId: string; moduleId: string; lessonId: string }[] = [];
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== today && date !== todayIST) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson) continue;
      items.push({ key, title: lesson.title, courseTitle: course.title, label: lessonNumberLabel(mod, lesson), done: isLessonComplete(lesson), ...parsed });
    }
    return items;
  }, [schedule, today, todayIST]);

  const primary = sprintFocus ? null : scheduledToday.find((i) => !i.done) ?? null;

  // Clear Home Main — keep prefs.mainShare in sync with Kolkata today's primary
  useEffect(() => {
    const next = computeMainShare(scheduledToday, todayIST, { clearDay: sprintFocus });
    if (!mainShareEquals(prefs.mainShare, next)) {
      onPatchPrefs({ mainShare: next });
    }
  }, [scheduledToday, todayIST, sprintFocus, prefs.mainShare, onPatchPrefs]);

  // Mirror Clear Home day graph (linchpin / life derailed) from shared Appwrite snapshot.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await pullClearHomeDayGraph();
        if (cancelled || !res.ok || !res.dayGraph) return;
        const g = res.dayGraph;
        onPatchPrefs({
          clearHomeDay: {
            dateKey: g.dateKey,
            tomorrowLinchpin: g.tomorrowLinchpin ?? null,
            lifeDerailed: !!g.lifeDerailed,
            restartedAt: typeof g.restartedAt === 'string' ? g.restartedAt : null,
            fluxDone: !!g.fluxDone,
            cabinMode:
              g.cabinMode === 'heading' || g.cabinMode === 'arrived' ? g.cabinMode : null,
            lateStart: !!g.lateStart,
            dropOffMode: !!g.dropOffMode,
            energyMood:
              g.energyMood === 'low' || g.energyMood === 'ok' || g.energyMood === 'high'
                ? g.energyMood
                : null,
            energyPackMinutes:
              typeof g.energyPackMinutes === 'number' ? g.energyPackMinutes : null,
            updatedAt: g.updatedAt || new Date().toISOString(),
          },
        });
      } catch {
        /* soft fail */
      }
    };
    void pull();
    const onVis = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [onPatchPrefs]);


  const primaryRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!highlightPrimary && !highlightLessonKey) return;
    const matchPrimary =
      highlightPrimary ||
      (highlightLessonKey && primary && primary.key === highlightLessonKey);
    if (matchPrimary && primaryRef.current) {
      primaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (highlightLessonKey) {
      const el = document.getElementById('today-highlight-lesson');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightPrimary, highlightLessonKey, primary, scheduledToday]);

  const suggestions = useMemo(() => {
    if (sprintFocus || scheduledToday.length) return [];
    return collectNextLessonKeys(COURSES, prefs.pinnedCourseId, 3).map((key) => {
      const parsed = parseLessonKey(key)!;
      const course = COURSES.find((c) => c.id === parsed.courseId)!;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId)!;
      const lesson = mod.lessons.find((l) => l.id === parsed.lessonId)!;
      return { key, title: lesson.title, courseTitle: course.title, label: lessonNumberLabel(mod, lesson) };
    });
  }, [scheduledToday.length, prefs.pinnedCourseId, sprintFocus]);

  const streakDates = useMemo(() => {
    const dates = new Set<string>();
    for (const c of COURSES) {
      for (const d of loadCourseState(c.id, c.modules).streakDates) dates.add(d);
    }
    return [...dates];
  }, []);
  const dailyView = useMemo(
    () => viewStreak(prefs.dailyStreak, todayIST),
    [prefs.dailyStreak, todayIST],
  );
  const showSoftStreakBanner = shouldShowSoftBanner(prefs.dailyStreak, todayIST, new Date(nowTick));
  const yesterdayIST = addDaysISO(todayIST, -1);
  const yesterdayOpen =
    (prefs.dailyStreak.finishesByDay[yesterdayIST] ?? 0) < 1 &&
    !prefs.dailyStreak.freezeDates.includes(yesterdayIST);
  const lifeDayFreeze =
    !!prefs.clearHomeDay?.lifeDerailed &&
    (prefs.clearHomeDay.dateKey === yesterdayIST || prefs.clearHomeDay.dateKey === todayIST) &&
    yesterdayOpen;

  const daysBehind = useMemo(() => countDaysBehind(schedule, COURSES, todayIST), [schedule, todayIST]);
  const dayDone = prefs.dayDoneDates.includes(today) || prefs.dayDoneDates.includes(todayIST);

  const tomorrowFirst = useMemo(() => {
    const tom = addDaysISO(todayIST, 1);
    for (const [key, date] of Object.entries(schedule)) {
      if (date !== tom) continue;
      const parsed = parseLessonKey(key);
      if (!parsed) continue;
      const course = COURSES.find((c) => c.id === parsed.courseId);
      if (!course) continue;
      const modules = peekCourseModules(course.id, course.modules);
      const mod = modules.find((m) => m.id === parsed.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === parsed.lessonId);
      if (!mod || !lesson || isLessonComplete(lesson)) continue;
      return { title: lesson.title, label: lessonNumberLabel(mod, lesson), ...parsed };
    }
    return null;
  }, [schedule, todayIST]);

  const todayWins = useMemo(() => {
    const wins: string[] = [];
    for (const c of COURSES) {
      for (const w of loadCourseState(c.id, c.modules).wins) {
        if (todayKey(new Date(w.completedAt)) === today) wins.push(w.label);
      }
    }
    return wins.slice(0, 8);
  }, [today]);

  const shield = canUseStreakShield({
    streakDates,
    budgetMetDates: prefs.dayDoneDates,
    shieldUsedWeek: prefs.streakShieldUsedWeek,
    today,
  });

  const showWeekly = isSunday() && prefs.weeklyReviewDismissedWeek !== weekKey;

  /** Calm energy pack from Better Home — never hero calendar minutes. */
  const energyPackMins =
    prefs.clearHomeDay?.dateKey === todayIST && prefs.clearHomeDay.energyPackMinutes
      ? prefs.clearHomeDay.energyPackMinutes
      : null;

  const weekWins = useMemo(() => {
    const lessons: string[] = [];
    const subtasks: string[] = [];
    for (const c of COURSES) {
      for (const w of loadCourseState(c.id, c.modules).wins) {
        if (isoWeekKey(new Date(w.completedAt)) !== weekKey) continue;
        if (w.type === 'lesson' || w.type === 'module') lessons.push(w.label);
        else subtasks.push(w.label);
      }
    }
    return { lessons: lessons.slice(0, 6), subtasks: subtasks.slice(0, 4), lessonCount: lessons.length, subtaskCount: subtasks.length };
  }, [weekKey]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">Calm Tracker · Progress, calmly.</p>
            <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {sprintFocus
                ? 'Sprint week — live learning first; path lessons stay clear.'
                : dailyView.current === 0
                  ? 'A soft start is still a start — one lesson is enough.'
                  : `${dailyView.current}-day streak · showing up is enough.`}
            </p>
          </div>
          <WeekExportButton schedule={schedule} />
        </div>
        <p className="text-[13px] leading-5 text-stone-400 dark:text-stone-500">{LIFE_GOAL}</p>
        <div className="mt-1"><StreakRing days={dailyView.current} /></div>
      </header>

      {/* P0 #5–#6: one lesson CTA first paint — no 1488 / guilt numbers above the fold */}
      {primary && (
        <div
          ref={primaryRef}
          id="today-primary"
          className={`rounded-3xl border bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm dark:from-orange-950/40 dark:to-stone-900 ${
            highlightPrimary || highlightLessonKey === primary.key
              ? 'border-orange-400 ring-2 ring-orange-300/70 dark:border-orange-500 dark:ring-orange-700/60'
              : 'border-orange-200 dark:border-orange-900/50'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">Today’s lesson</p>
          <p className="mt-1 text-xs text-orange-600/80 dark:text-orange-300/80">{primary.label}</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-100">{primary.title}</h2>
          <p className="text-xs text-stone-400">{primary.courseTitle}</p>
          <button type="button" onClick={() => onOpen(primary.courseId, primary.moduleId, primary.lessonId)} className="mt-4 w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm">Open today’s lesson</button>
        </div>
      )}

      {!primary && !sprintFocus && suggestions[0] && (
        <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">
          <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">One calm start</p>
          <h2 className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-100">{suggestions[0].title}</h2>
          <p className="text-xs text-stone-400">{suggestions[0].courseTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const p = parseLessonKey(suggestions[0].key)!;
                onOpen(p.courseId, p.moduleId, p.lessonId);
              }}
              className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Open one lesson
            </button>
            <button
              type="button"
              onClick={() => onSchedule(suggestions[0].key, today)}
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-stone-900 dark:text-orange-300"
            >
              Schedule today
            </button>
          </div>
        </div>
      )}

      {(() => {
        const ch = prefs.clearHomeDay;
        const yesterday = addDaysISO(todayIST, -1);
        const linchpin =
          ch &&
          ((ch.dateKey === yesterday && ch.tomorrowLinchpin) ||
            (ch.dateKey === todayIST && ch.tomorrowLinchpin))
            ? ch.tomorrowLinchpin
            : null;
        if (!linchpin) return null;
        return (
          <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900/70">
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">From Better Home</p>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
              Linchpin · <span className="font-medium text-stone-800 dark:text-stone-100">{linchpin}</span>
            </p>
          </div>
        );
      })()}

      {prefs.clearHomeDay?.lifeDerailed && prefs.clearHomeDay.dateKey === todayIST && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/60">
          {prefs.clearHomeDay.restartedAt ? (
            <>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Day restarted from Better Home · pack adjusted
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                One calm lesson is still enough inside today’s window.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                Better Home is in recovery — no shame. One calm lesson here is enough.
              </p>
              <a
                href={clearHomeRecoveryUrl()}
                className="mt-2 inline-flex text-xs font-medium text-stone-500 underline underline-offset-2"
              >
                Reopen Better Home plan
              </a>
            </>
          )}
        </div>
      )}

      {prefs.clearHomeDay?.cabinMode && prefs.clearHomeDay.dateKey === todayIST && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900/70">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Better Home · cabin</p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
            {prefs.clearHomeDay.cabinMode === 'arrived'
              ? 'Cabin deep-work window — one calm lesson is enough.'
              : 'Heading to cabin — settle in, then one lesson here.'}
          </p>
        </div>
      )}

      {prefs.clearHomeDay?.lateStart && prefs.clearHomeDay.dateKey === todayIST && !prefs.clearHomeDay.cabinMode && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900/70">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Better Home · late start</p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
            Morning cabin Flux skipped — home window still open. Soft is fine.
          </p>
        </div>
      )}

      {prefs.clearHomeDay?.dropOffMode && prefs.clearHomeDay.dateKey === todayIST && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900/70">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Better Home · drop-off</p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
            Drop-off mode — Calm Tracker waits for the home window after.
          </p>
        </div>
      )}

      {energyPackMins && !prefs.clearHomeDay?.fluxDone && !prefs.clearHomeDay?.restartedAt && !primary && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900/70">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Better Home · energy pack</p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">
            Suggested pack · ~{energyPackMins}m
            {prefs.clearHomeDay?.energyMood === 'low'
              ? ' — shorter is enough today.'
              : prefs.clearHomeDay?.energyMood === 'high'
                ? ' — a full lesson fits if a window is open.'
                : ' — steady mid-length is fine.'}
          </p>
        </div>
      )}

      {!prefs.tipDismissed && <IpadTip onDismiss={onDismissTip} />}
      {!prefs.tipDismissed && <InstallChecklist onDismiss={onDismissTip} />}

      {(() => {
        const w = getFluxWindow()
        const copy = fluxWindowCopy(w)
        const deep = w === 'deep'
        return (
          <div
            className={`rounded-2xl border px-4 py-3 ${
              deep
                ? 'border-orange-100 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20'
                : 'border-stone-100 bg-white/70 dark:border-stone-800 dark:bg-stone-900/40'
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{copy.title}</p>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{copy.body}</p>
            <a
              href={clearHomeDayPulseUrl()}
              className="mt-1.5 inline-block text-[11px] font-medium text-stone-400 underline underline-offset-2"
            >
              Better Home · A better day, as it happens.
            </a>
          </div>
        )
      })()}

      <div className={`rounded-2xl border px-4 py-3 ${sprintFocus ? 'border-stone-100 bg-stone-50/40 opacity-80 dark:border-stone-800' : 'border-stone-100 bg-white/80 dark:border-stone-800 dark:bg-stone-900/60'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">24-day calm plan</h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {sprintFocus ? 'Plan days stay clear on purpose during sprint focus.' : FLUX_DEEP_BLOCKS_HINT}
            </p>
          </div>
          {!sprintFocus && (
            <PlanGenerateControl hasPlan={Boolean(prefs.planGeneratedAt) || Object.keys(schedule).length > 0} planGeneratedAt={prefs.planGeneratedAt} onGenerate={onGeneratePlan} />
          )}
        </div>
      </div>

      {sprintFocus && <SprintWeekBanner href={sprintHref} />}

      {!sprintFocus && daysBehind >= 2 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Optional soft reset — compress the next few plan days if you want. Boss-pinned lessons stay put.
          </p>
          <button
            type="button"
            onClick={onCatchUp}
            className="mt-2 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
          >
            Optional · compress 3 days
          </button>
        </div>
      )}

      {!sprintFocus && (
        <StreakStrip
          view={dailyView}
          onUseFreeze={yesterdayOpen && onUseFreeze ? onUseFreeze : undefined}
          freezeHintDay={yesterdayOpen ? yesterdayIST : null}
          lifeDay={lifeDayFreeze}
        />
      )}

      {!sprintFocus && showSoftStreakBanner && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/70">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">Evening nudge — one lesson keeps the streak.</p>
            <button
              type="button"
              className="shrink-0 text-xs text-stone-400 underline underline-offset-2"
              onClick={() => onDismissStreakBanner?.()}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!sprintFocus && shield.canShield && !streakDates.includes(addDaysISO(today, -1)) && (
        <div className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/70">
          <p className="text-sm text-stone-500 dark:text-stone-400">Missed a day? Streak shield is free once this week if you already met budget earlier.</p>
          <button type="button" onClick={() => onUseShield(shield.weekKey)} className="mt-2 rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-stone-200 dark:text-stone-900">Use streak shield</button>
        </div>
      )}


      {getFluxWindow() === 'deep' && primary ? (
        <p className="text-center text-xs text-stone-400">Hormozi Deep · primary only. Other lessons wait outside this block.</p>
      ) : null}

      <DoThisNext
        queue={queue}
        onOpen={onOpen}
        onTick={onTickQueue}
        deemphasized={sprintFocus || (getFluxWindow() === 'deep' && !!primary)}
        binaryHint={(!primary && !sprintFocus) || getFluxWindow() === 'deep'}
      />

      {/* No 20-lesson "Scheduled for today" list — Upcoming / Path only. */}
      {!(getFluxWindow() === 'deep' && primary) && scheduledToday.length > 0 && (
        <p className="text-center text-xs text-stone-400">
          More for today waits on{' '}
          <span className="font-medium text-stone-500 dark:text-stone-300">Upcoming</span>
          {' · '}
          <span className="font-medium text-stone-500 dark:text-stone-300">Path</span>
          . One lesson here is enough.
        </p>
      )}

      <TodayCloseBlock
        dayDone={dayDone}
        showClose={showClose}
        todayWins={todayWins}
        tomorrowFirst={tomorrowFirst}
        sprintFocus={sprintFocus}
        onMarkDayDone={onMarkDayDone}
        onShowClose={() => setShowClose(true)}
      />

      <StreakWeeklyStrip current={dailyView.current} longest={dailyView.longest} compact={!isSunday()} />

      {showWeekly && (
        <WeeklyReviewCard
          lessonCount={weekWins.lessonCount}
          subtaskCount={weekWins.subtaskCount}
          lessonLabels={weekWins.lessons}
          subtaskLabels={weekWins.subtasks}
          streak={dailyView.current}
          focusDraft={focusDraft}
          onFocusDraft={setFocusDraft}
          lastFocusNote={prefs.weeklyFocusNote}
          showLastFocus={prefs.lastWeeklyReviewWeekKey !== weekKey}
          onSkip={onDismissWeeklyReview}
          onSave={() => { onSaveWeeklyFocus(focusDraft); onDismissWeeklyReview(); }}
        />
      )}

      {!showWeekly && prefs.weeklyFocusNote && (
        <p className="text-center text-xs text-stone-400">This week’s gentle focus: <span className="text-stone-600 dark:text-stone-300">{prefs.weeklyFocusNote}</span></p>
      )}
    </section>
  );
}
