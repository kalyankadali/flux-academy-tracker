import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { SyncPayload } from './sync';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anon);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signInWithMagicLink(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured.' };
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export type SnapshotRow = {
  user_id: string;
  sync_id: string;
  payload: SyncPayload;
  updated_at: string;
};

export async function pushSnapshot(
  syncId: string,
  payload: SyncPayload,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured.' };
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Sign in with magic link first.' };

  const row = {
    user_id: session.user.id,
    sync_id: syncId,
    payload,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from('tracker_snapshots')
    .upsert(row, { onConflict: 'user_id' })
    .select('updated_at')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, updatedAt: data?.updated_at ?? row.updated_at };
}

export async function pullSnapshot(): Promise<
  { ok: true; row: SnapshotRow | null } | { ok: false; error: string }
> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase is not configured.' };
  const session = await getSession();
  if (!session?.user) return { ok: false, error: 'Sign in with magic link first.' };

  const { data, error } = await sb
    .from('tracker_snapshots')
    .select('user_id, sync_id, payload, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: (data as SnapshotRow | null) ?? null };
}

/** Merge remote + local: prefer newer exportedAt; union schedule keys; keep max progress via apply on winner then overlay. */
export function mergeSyncPayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  const localAt = new Date(local.exportedAt).getTime();
  const remoteAt = new Date(remote.exportedAt).getTime();
  const newer = remoteAt >= localAt ? remote : local;
  const older = remoteAt >= localAt ? local : remote;

  const schedule = { ...older.prefs.schedule, ...newer.prefs.schedule };
  const courseStates = { ...older.courseStates, ...newer.courseStates };

  // For overlapping course keys, keep the one with more completed subtasks if parseable
  for (const key of Object.keys(older.courseStates)) {
    if (!(key in newer.courseStates)) continue;
    try {
      const a = JSON.parse(older.courseStates[key]) as { modules?: { lessons?: { subtasks?: { completed?: boolean }[] }[] }[] };
      const b = JSON.parse(newer.courseStates[key]) as { modules?: { lessons?: { subtasks?: { completed?: boolean }[] }[] }[] };
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
