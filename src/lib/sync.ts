/**
 * Cross-device sync MVP
 * --------------------
 * 1. Always autosave to localStorage (per-course + prefs).
 * 2. Export / Import full progress JSON (file or paste) — works iPad ↔ Mac.
 * 3. Sync code (UUID) identifies your bundle; copy it with the payload.
 * 4. Optional cloud: if VITE_JSONBIN_API_KEY is set, push/pull via JSONBin.
 *    Without a key, cloud buttons explain export/import is the reliable path.
 */

import { PREFS_KEY, loadPrefs, savePrefs } from '../utils/prefs';
import type { AppPrefs } from '../types';

export const SYNC_PAYLOAD_VERSION = 1 as const;

export interface SyncPayload {
  version: typeof SYNC_PAYLOAD_VERSION;
  syncId: string;
  exportedAt: string;
  prefs: AppPrefs;
  /** Raw localStorage entries for flux-course-tracker:* and legacy key */
  courseStates: Record<string, string>;
}

const COURSE_KEY_PREFIX = 'flux-course-tracker:v1:';
const LEGACY_KEY = 'figma-course-tracker-v1';

export function collectCourseStates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(COURSE_KEY_PREFIX) || key === LEGACY_KEY) {
      const val = localStorage.getItem(key);
      if (val != null) out[key] = val;
    }
  }
  return out;
}

export function buildSyncPayload(prefs?: AppPrefs): SyncPayload {
  const p = prefs ?? loadPrefs();
  return {
    version: SYNC_PAYLOAD_VERSION,
    syncId: p.syncId,
    exportedAt: new Date().toISOString(),
    prefs: p,
    courseStates: collectCourseStates(),
  };
}

export function applySyncPayload(payload: SyncPayload): { ok: true } | { ok: false; error: string } {
  if (!payload || payload.version !== SYNC_PAYLOAD_VERSION) {
    return { ok: false, error: 'Unrecognized sync file version.' };
  }
  if (!payload.prefs || !payload.courseStates) {
    return { ok: false, error: 'Sync payload is missing prefs or course data.' };
  }
  try {
    // Clear existing course keys then apply
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(COURSE_KEY_PREFIX) || key === LEGACY_KEY)) {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);

    for (const [k, v] of Object.entries(payload.courseStates)) {
      localStorage.setItem(k, v);
    }

    const prefs: AppPrefs = {
      ...payload.prefs,
      syncId: payload.syncId || payload.prefs.syncId,
      lastSyncAt: new Date().toISOString(),
    };
    savePrefs(prefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Import failed.' };
  }
}

export function downloadSyncFile(payload: SyncPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flux-tracker-sync-${payload.syncId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function hasJsonBinKey(): boolean {
  return Boolean(import.meta.env.VITE_JSONBIN_API_KEY);
}

/**
 * Optional JSONBin cloud push/pull.
 * Requires VITE_JSONBIN_API_KEY (and optionally VITE_JSONBIN_BIN_ID).
 */
export async function cloudPush(payload: SyncPayload): Promise<{ ok: true; binId: string } | { ok: false; error: string }> {
  const key = import.meta.env.VITE_JSONBIN_API_KEY as string | undefined;
  if (!key) {
    return { ok: false, error: 'No VITE_JSONBIN_API_KEY — use Export / Import instead.' };
  }
  const existing = (import.meta.env.VITE_JSONBIN_BIN_ID as string | undefined) || loadPrefs().remoteBlobId;
  try {
    if (existing) {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${existing}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': key,
          'X-Bin-Versioning': 'false',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`JSONBin update failed (${res.status})`);
      return { ok: true, binId: existing };
    }
    const res = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Name': `flux-tracker-${payload.syncId.slice(0, 8)}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`JSONBin create failed (${res.status})`);
    const data = (await res.json()) as { metadata?: { id?: string } };
    const binId = data.metadata?.id;
    if (!binId) throw new Error('JSONBin response missing bin id');
    return { ok: true, binId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Cloud push failed' };
  }
}

export async function cloudPull(binId: string): Promise<{ ok: true; payload: SyncPayload } | { ok: false; error: string }> {
  const key = import.meta.env.VITE_JSONBIN_API_KEY as string | undefined;
  if (!key) {
    return { ok: false, error: 'No VITE_JSONBIN_API_KEY — paste or import a sync file instead.' };
  }
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': key },
    });
    if (!res.ok) throw new Error(`JSONBin read failed (${res.status})`);
    const data = (await res.json()) as { record: SyncPayload };
    if (!data.record?.version) throw new Error('Remote data is not a Flux sync payload');
    return { ok: true, payload: data.record };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Cloud pull failed' };
  }
}

export function parseSyncJson(text: string): { ok: true; payload: SyncPayload } | { ok: false; error: string } {
  try {
    const payload = JSON.parse(text) as SyncPayload;
    if (payload.version !== SYNC_PAYLOAD_VERSION) {
      return { ok: false, error: 'Unsupported sync version.' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'Could not parse JSON.' };
  }
}
