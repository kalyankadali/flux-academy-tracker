import { useEffect, useRef } from 'react';
import type { AppPrefs } from '../types';
import { applySyncPayload, buildSyncPayload } from '../lib/sync';
import {
  completeOAuthFromUrl,
  getSession,
  isCloudConfigured,
  mergeSyncPayloads,
  pullSnapshot,
  pushSnapshot,
} from '../lib/appwrite';
import { loadPrefs } from '../utils/prefs';
import { FLUX_LOCAL_CHANGED, withSyncQuiet } from '../lib/syncEvents';

const PUSH_DEBOUNCE_MS = 2000;

/**
 * While signed in: pull/merge on open/focus; debounce-push after local changes.
 * Completes OAuth token callback before getSession so Safari ITP sessions stick.
 * Silent on success.
 */
export function useAutoCloudSync(
  prefs: AppPrefs,
  onImported: (prefs: AppPrefs) => void,
  onMarkSynced: () => void,
): void {
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const dirtyRef = useRef(false);
  const pushingRef = useRef(false);
  const pullingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onImportedRef = useRef(onImported);
  const onMarkSyncedRef = useRef(onMarkSynced);
  onImportedRef.current = onImported;
  onMarkSyncedRef.current = onMarkSynced;

  useEffect(() => {
    if (!isCloudConfigured()) return;

    const clearTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const ensureSession = async () => {
      // Token flow may still be in the URL on first paint — finish before getSession.
      await completeOAuthFromUrl();
      return getSession();
    };

    const doPush = async () => {
      if (pushingRef.current) return;
      const session = await ensureSession();
      if (!session?.user) {
        dirtyRef.current = false;
        return;
      }
      pushingRef.current = true;
      try {
        const p = loadPrefs();
        const payload = buildSyncPayload(p);
        const res = await pushSnapshot(p.syncId, payload);
        if (!res.ok) {
          console.warn('[flux auto-sync] push failed', res.error);
          return;
        }
        dirtyRef.current = false;
        withSyncQuiet(() => {
          onMarkSyncedRef.current();
        });
      } catch (err) {
        console.warn('[flux auto-sync] push failed', err);
      } finally {
        pushingRef.current = false;
      }
    };

    const doPull = async () => {
      if (pullingRef.current || dirtyRef.current || pushingRef.current) return;
      const session = await ensureSession();
      if (!session?.user) return;
      pullingRef.current = true;
      try {
        const res = await pullSnapshot();
        if (!res.ok) {
          console.warn('[flux auto-sync] pull failed', res.error);
          return;
        }

        // First sign-in / empty cloud: seed with local progress so other devices can pull.
        if (!res.row?.payload) {
          pullingRef.current = false;
          dirtyRef.current = true;
          await doPush();
          return;
        }

        const remote = res.row.payload;
        const remoteAt = Date.parse(remote.exportedAt || res.row.updated_at || '');
        const localAt = Date.parse(prefsRef.current.lastSyncAt || '') || 0;
        if (!Number.isFinite(remoteAt) || remoteAt <= localAt) return;

        const local = buildSyncPayload(loadPrefs());
        const merged = mergeSyncPayloads(local, remote);
        const applied = applySyncPayload(merged, { quiet: true });
        if (!applied.ok) return;
        withSyncQuiet(() => {
          onImportedRef.current(loadPrefs());
          onMarkSyncedRef.current();
        });

        // If merge kept local-only progress, push combined snapshot back.
        const mergedCourseKeys = Object.keys(merged.courseStates).sort().join(',');
        const remoteCourseKeys = Object.keys(remote.courseStates).sort().join(',');
        const mergedBigger =
          JSON.stringify(merged.courseStates) !== JSON.stringify(remote.courseStates) ||
          JSON.stringify(merged.prefs.schedule) !== JSON.stringify(remote.prefs.schedule) ||
          mergedCourseKeys !== remoteCourseKeys;
        if (mergedBigger) {
          pullingRef.current = false;
          dirtyRef.current = true;
          await doPush();
        }
      } catch (err) {
        console.warn('[flux auto-sync] pull failed', err);
      } finally {
        pullingRef.current = false;
      }
    };

    const schedulePush = () => {
      dirtyRef.current = true;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void doPush();
      }, PUSH_DEBOUNCE_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (dirtyRef.current) {
          clearTimer();
          void doPush();
        }
        return;
      }
      void doPull();
    };

    const onFocus = () => {
      void doPull();
    };

    void doPull();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener(FLUX_LOCAL_CHANGED, schedulePush);
    window.addEventListener('pagehide', onVisibility);

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(FLUX_LOCAL_CHANGED, schedulePush);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, []);
}
