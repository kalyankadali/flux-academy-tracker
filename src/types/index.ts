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

export interface AppPrefs {
  version: 2;
  syncId: string;
  theme: ThemeMode;
  pinnedCourseId: string | null;
  recentlyUsed: string[];
  showAllCourses: boolean;
  /** lessonKey -> YYYY-MM-DD target date */
  schedule: Record<string, string>;
  queue: QueueBatch;
  lastSyncAt: string | null;
  /** Optional remote blob id when using JSONBin-style cloud */
  remoteBlobId: string | null;
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
