export interface Subtask {
  id: string;
  label: string;
  estimatedMinutes: number;
  completed: boolean;
  actualMinutes: number | null;
  timerStartedAt: string | null;
  url?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  durationMinutes: number;
  description: string;
  completed: boolean;
  subtasks: Subtask[];
  /** Real Circle/Flux lesson URL when known — never invent */
  url?: string;
}

export interface Module {
  id: string;
  number: number;
  title: string;
  lessons: Lesson[];
}

export interface CourseData {
  id: string;
  title: string;
  url: string;
  modules: Module[];
  /** Empty curriculum placeholder until scrape/import lands */
  comingSoon?: boolean;
}

export interface WinEntry {
  id: string;
  label: string;
  type: 'subtask' | 'lesson' | 'module';
  completedAt: string;
}

export interface AppState {
  modules: Module[];
  streakDates: string[]; // YYYY-MM-DD in local time
  wins: WinEntry[];
  hideCompleted: boolean;
  lastCelebration?: string;
}

/** lessonKey = courseId::moduleId::lessonId */
export type LessonKey = string;

export interface QueueBatch {
  /** Up to 3 lesson keys currently shown */
  keys: LessonKey[];
  /** Keys completed within this batch (tick off until all 3 done) */
  completedKeys: LessonKey[];
}

export type ThemeMode = 'light' | 'dark';

export type SubtaskKind = 'watch' | 'download' | 'practice' | 'other';

export interface UndoSnapshot {
  courseId: string;
  moduleId: string;
  lessonId: string;
  subtaskId: string;
  expiresAt: number;
}

export interface MainShare {
  dateISO: string;
  lessonKey: LessonKey;
  title: string;
  done: boolean;
}

export interface AppPrefs {
  version: 2;
  syncId: string;
  theme: ThemeMode;
  pinnedCourseId: string | null;
  /** Boss lesson — catch-up won't skip */
  pinnedLessonKey: LessonKey | null;
  recentlyUsed: string[];
  showAllCourses: boolean;
  /** lessonKey -> YYYY-MM-DD target date */
  schedule: Record<string, string>;
  queue: QueueBatch;
  lastSyncAt: string | null;
  /** Optional remote blob id when using JSONBin-style cloud */
  remoteBlobId: string | null;
  /** Soft daily focus budget in minutes (~90–120) */
  dailyBudgetMinutes: number;
  /** When true, Today can defer practice subtasks */
  deferPractice: boolean;
  /** Lesson fullscreen focus (hide top tabs) */
  focusLessonMode: boolean;
  /** Dates marked "day done" via close ritual */
  dayDoneDates: string[];
  /** ISO week (YYYY-Www) when streak shield was used */
  streakShieldUsedWeek: string | null;
  /** Last undoable check (~30s) */
  lastUndo: UndoSnapshot | null;
  /** Stub: morning ping coming later */
  morningPingEnabled: boolean;
  /** When 40-day plan was last generated */
  planGeneratedAt: string | null;
  /** ISO week when weekly review was dismissed */
  weeklyReviewDismissedWeek: string | null;
  /** ISO week key when weekly review was last completed/saved */
  lastWeeklyReviewWeekKey: string | null;
  /** Optional one-line focus note from Sunday review */
  weeklyFocusNote: string | null;
  /** One-time iPad home-screen tip dismissed */
  tipDismissed: boolean;
  /** Catch-up compress applied for these dates */
  catchUpCompressedUntil: string | null;
  /** Asia/Kolkata YYYY-MM-DD when first-win cheer was shown */
  lastFirstWinDayISO: string | null;
  /** Clear Home “Main” — today’s primary scheduled lesson (IST) */
  mainShare: MainShare | null;
}

export type TopTab = 'home' | 'today' | 'upcoming' | 'calendar' | 'sync';

export type View =
  | { type: 'dashboard' }
  | { type: 'lesson'; moduleId: string; lessonId: string };

export interface QueueItem {
  key: LessonKey;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleNumber: number;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  label: string; // e.g. "Module 2 · Lesson 3"
  completedInQueue: boolean;
}
