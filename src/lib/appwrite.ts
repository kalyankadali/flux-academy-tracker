import {
  Client,
  Account,
  Databases,
  OAuthProvider,
  Permission,
  Role,
} from 'appwrite';
import type { SyncPayload } from './sync';

const DEFAULT_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const DEFAULT_PROJECT_ID = '6aafc3d40001cf6b0d6d';
const DATABASE_ID = 'main';
const COLLECTION_ID = 'flux_snapshots';

const endpoint =
  (import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined)?.trim() || DEFAULT_ENDPOINT;
const projectId =
  (import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined)?.trim() || DEFAULT_PROJECT_ID;

/** Prefer this name; kept as cloud-agnostic “configured” check. */
export function isCloudConfigured(): boolean {
  return Boolean(endpoint && projectId);
}

/** @deprecated Use isCloudConfigured — shim for older call sites. */
export function isSupabaseConfigured(): boolean {
  return isCloudConfigured();
}

export function isAppwriteConfigured(): boolean {
  return isCloudConfigured();
}

export type AuthUser = {
  id: string;
  email?: string;
};

/** Shape compatible with SyncPanel’s former Supabase Session usage. */
export type AuthSession = {
  user: AuthUser;
};

let client: Client | null = null;
let account: Account | null = null;
let databases: Databases | null = null;

function getClient(): Client | null {
  if (!isCloudConfigured()) return null;
  if (!client) {
    client = new Client().setEndpoint(endpoint).setProject(projectId);
  }
  return client;
}

export function getAccount(): Account | null {
  const c = getClient();
  if (!c) return null;
  if (!account) account = new Account(c);
  return account;
}

export function getDatabases(): Databases | null {
  const c = getClient();
  if (!c) return null;
  if (!databases) databases = new Databases(c);
  return databases;
}

function appwriteErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function isNotFound(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: unknown }).code === 404,
  );
}

function userFromModel(u: { $id: string; email?: string }): AuthUser {
  return { id: u.$id, email: u.email };
}

export async function getSession(): Promise<AuthSession | null> {
  const acc = getAccount();
  if (!acc) return null;
  try {
    const user = await acc.get();
    return { user: userFromModel(user) };
  } catch {
    return null;
  }
}

/**
 * Start Google OAuth2 via Appwrite token flow (Safari/ITP-safe).
 * Redirects to Google; success returns with ?userId=&secret= for createSession.
 */
export function signInWithGoogle(): { ok: true } | { ok: false; error: string } {
  const acc = getAccount();
  if (!acc) return { ok: false, error: 'Appwrite is not configured.' };
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Sign-in requires a browser.' };
  }
  // Land on Sync tab after OAuth so UI refreshes to signed-in state.
  const redirectTo = `${window.location.origin}${window.location.pathname}?tab=sync`;
  try {
    acc.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: redirectTo,
      failure: redirectTo,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: appwriteErrorMessage(err, 'Could not start Google sign-in.') };
  }
}

/**
 * After OAuth redirect: exchange userId+secret for a session (localStorage fallback),
 * then strip those query params. Safe to call on every boot.
 */
export async function completeOAuthFromUrl(): Promise<AuthSession | null> {
  if (typeof window === 'undefined') return null;
  const acc = getAccount();
  if (!acc) return null;

  const url = new URL(window.location.href);
  const userId = url.searchParams.get('userId');
  const secret = url.searchParams.get('secret');
  if (!userId || !secret) return null;

  try {
    await acc.createSession({ userId, secret });
  } catch (err) {
    console.warn('[flux auth] createSession after OAuth failed', err);
    // Still strip secrets from the URL.
  }

  url.searchParams.delete('userId');
  url.searchParams.delete('secret');
  const next =
    url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash;
  window.history.replaceState({}, '', next);

  return getSession();
}

export async function signOut(): Promise<void> {
  const acc = getAccount();
  if (!acc) return;
  try {
    await acc.deleteSession('current');
  } catch {
    // ignore if already signed out
  }
}

export type SnapshotRow = {
  user_id: string;
  sync_id: string;
  payload: SyncPayload;
  updated_at: string;
};

type SnapshotDoc = {
  $id: string;
  sync_id?: string;
  payload?: string;
  updated_at?: string;
  user_id?: string;
};

function parsePayload(raw: string | undefined): SyncPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncPayload;
  } catch {
    return null;
  }
}

function ownPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

export async function pushSnapshot(
  syncId: string,
  payload: SyncPayload,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const db = getDatabases();
  if (!db) return { ok: false, error: 'Appwrite is not configured.' };
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Sign in with Google first.' };

  const userId = session.user.id;
  const updatedAt = new Date().toISOString();
  const data = {
    sync_id: syncId,
    payload: JSON.stringify(payload),
    updated_at: updatedAt,
    user_id: userId,
  };

  try {
    try {
      await db.getDocument(DATABASE_ID, COLLECTION_ID, userId);
      await db.updateDocument(DATABASE_ID, COLLECTION_ID, userId, data);
    } catch (err) {
      if (!isNotFound(err)) throw err;
      await db.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        userId,
        data,
        ownPermissions(userId),
      );
    }
    return { ok: true, updatedAt };
  } catch (err) {
    return { ok: false, error: appwriteErrorMessage(err, 'Push failed.') };
  }
}

export async function pullSnapshot(): Promise<
  { ok: true; row: SnapshotRow | null } | { ok: false; error: string }
> {
  const db = getDatabases();
  if (!db) return { ok: false, error: 'Appwrite is not configured.' };
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Sign in with Google first.' };

  const userId = session.user.id;
  try {
    const doc = (await db.getDocument(DATABASE_ID, COLLECTION_ID, userId)) as SnapshotDoc;
    const payload = parsePayload(doc.payload);
    if (!payload) return { ok: true, row: null };
    return {
      ok: true,
      row: {
        user_id: doc.user_id || userId,
        sync_id: doc.sync_id || payload.syncId,
        payload,
        updated_at: doc.updated_at || payload.exportedAt,
      },
    };
  } catch (err) {
    if (isNotFound(err)) return { ok: true, row: null };
    return { ok: false, error: appwriteErrorMessage(err, 'Pull failed.') };
  }
}

/** Merge remote + local: prefer newer exportedAt; union schedule keys; keep max progress via apply on winner then overlay. */
export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const localAt = new Date(local.exportedAt).getTime();
  const remoteAt = new Date(remote.exportedAt).getTime();
  const newer = remoteAt >= localAt ? remote : local;
  const older = remoteAt >= localAt ? local : remote;

  const schedule = { ...older.prefs.schedule, ...newer.prefs.schedule };
  const courseStates = { ...older.courseStates, ...newer.courseStates };

  for (const key of Object.keys(older.courseStates)) {
    if (!(key in newer.courseStates)) continue;
    try {
      const a = JSON.parse(older.courseStates[key]) as {
        modules?: { lessons?: { subtasks?: { completed?: boolean }[] }[] }[];
      };
      const b = JSON.parse(newer.courseStates[key]) as {
        modules?: { lessons?: { subtasks?: { completed?: boolean }[] }[] }[];
      };
      const count = (s: typeof a) =>
        (s.modules ?? []).reduce(
          (n, m) =>
            n +
            (m.lessons ?? []).reduce(
              (n2, l) => n2 + (l.subtasks ?? []).filter((t) => t.completed).length,
              0,
            ),
          0,
        );
      courseStates[key] = count(a) > count(b) ? older.courseStates[key] : newer.courseStates[key];
    } catch {
      // keep newer
    }
  }

  return {
    version: newer.version,
    syncId: newer.syncId || older.syncId,
    exportedAt: new Date().toISOString(),
    prefs: {
      ...older.prefs,
      ...newer.prefs,
      schedule,
      syncId: newer.syncId || older.syncId,
    },
    courseStates,
  };
}
