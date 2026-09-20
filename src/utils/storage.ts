import { notifyFluxLocalChanged } from '../lib/syncEvents';
import type { AppState, Module } from '../types';

export const OLD_STORAGE_KEY = 'figma-course-tracker-v1';
export const FIGMA_COURSE_ID = 'figma-for-web-designers-2-0';

export function courseStorageKey(courseId: string): string {
  return `flux-course-tracker:v1:${courseId}`;
}

function emptyState(modules: Module[]): AppState {
  return {
    modules: structuredClone(modules),
    streakDates: [],
    wins: [],
    hideCompleted: false,
  };
}

/** Load per-course progress; migrates legacy single-course key into Figma course id. */
export function loadCourseState(courseId: string, seedModules: Module[]): AppState {
  try {
    const key = courseStorageKey(courseId);
    let raw = localStorage.getItem(key);

    if (!raw && courseId === FIGMA_COURSE_ID) {
      const legacy = localStorage.getItem(OLD_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        localStorage.setItem(key, legacy);
        // Keep OLD_STORAGE_KEY so migration never wipes existing progress.
      }
    }

    if (!raw) return emptyState(seedModules);

    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.modules?.length && seedModules.length > 0) {
      return emptyState(seedModules);
    }
    return {
      ...parsed,
      hideCompleted: !!parsed.hideCompleted,
      streakDates: parsed.streakDates ?? [],
      wins: parsed.wins ?? [],
    };
  } catch {
    return emptyState(seedModules);
  }
}

export function saveCourseState(courseId: string, state: AppState): void {
  localStorage.setItem(courseStorageKey(courseId), JSON.stringify(state));
  notifyFluxLocalChanged();
}

/** Peek saved modules for home-screen progress without mutating storage. */
export function peekCourseModules(courseId: string, seedModules: Module[]): Module[] {
  try {
    const key = courseStorageKey(courseId);
    let raw = localStorage.getItem(key);
    if (!raw && courseId === FIGMA_COURSE_ID) {
      raw = localStorage.getItem(OLD_STORAGE_KEY);
    }
    if (!raw) return seedModules;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.modules?.length) return seedModules;
    return parsed.modules;
  } catch {
    return seedModules;
  }
}
