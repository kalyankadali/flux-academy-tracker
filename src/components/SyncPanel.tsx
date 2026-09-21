import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppPrefs } from '../types';
import {
  applySyncPayload,
  buildSyncPayload,
  copyText,
  downloadSyncFile,
  parseSyncJson,
} from '../lib/sync';
import {
  completeOAuthFromUrl,
  getSession,
  isCloudConfigured,
  signInWithGoogle,
  signOut,
  type AuthSession,
} from '../lib/appwrite';
import { loadPrefs } from '../utils/prefs';
import { IpadTip } from './IpadTip';

interface Props {
  prefs: AppPrefs;
  onImported: (prefs: AppPrefs) => void;
  onMarkSynced: (remoteBlobId?: string | null) => void;
  morningPingEnabled: boolean;
  onMorningPing: (v: boolean) => void;
  tipDismissed?: boolean;
  onDismissTip?: () => void;
}

export function SyncPanel({
  prefs,
  onImported,
  onMarkSynced: _onMarkSynced,
  morningPingEnabled,
  onMorningPing,
  tipDismissed = true,
  onDismissTip,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloudReady = isCloudConfigured();

  const refreshSession = useCallback(async () => {
    const fromOauth = await completeOAuthFromUrl();
    const s = fromOauth ?? (await getSession());
    setSession(s);
  }, []);

  useEffect(() => {
    void refreshSession();
    const onFocus = () => {
      void refreshSession();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshSession]);

  const exportNow = () => {
    const payload = buildSyncPayload(prefs);
    downloadSyncFile(payload);
    setStatus('Downloaded sync file — open it on your other device and Import.');
  };

  const copyPayload = async () => {
    const payload = buildSyncPayload(prefs);
    const ok = await copyText(JSON.stringify(payload));
    setStatus(ok ? 'Sync payload copied. Paste it on your other device.' : 'Could not copy — try Download instead.');
  };

  const doImportText = (text: string) => {
    const parsed = parseSyncJson(text);
    if (!parsed.ok) {
      setStatus(parsed.error);
      return;
    }
    const result = applySyncPayload(parsed.payload);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    onImported(loadPrefs());
    setStatus('Import complete. Progress restored from sync payload.');
    setPaste('');
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    doImportText(text);
  };

  const startGoogle = () => {
    setBusy(true);
    const res = signInWithGoogle();
    if (!res.ok) {
      setBusy(false);
      setStatus(res.error);
      window.alert(res.error);
      return;
    }
    // Browser redirects to Google / Appwrite; keep busy until unload.
    setStatus('Redirecting to Google…');
  };

  const lastSyncedLabel = prefs.lastSyncAt
    ? new Date(prefs.lastSyncAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Sync
        </p>
        <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Cross-device progress
        </h1>
        <p className="max-w-xl text-sm text-stone-500 dark:text-stone-400">
          Progress always saves in this browser. Sign in with the same Google account on every
          device — sync runs automatically. Export / Import stays as a calm backup.
        </p>
      </header>

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Appwrite · Google</h2>
        {!cloudReady ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID to enable cloud sync.
          </p>
        ) : session?.user ? (
          <>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              Signed in as <span className="font-medium">{session.user.email}</span>
            </p>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Syncing automatically…
            </p>
            {lastSyncedLabel && (
              <p className="mt-1 text-xs text-stone-400">Last synced: {lastSyncedLabel}</p>
            )}
            <p className="mt-1 text-xs text-stone-400">
              Use the same Google account on every device. Changes push in the background; opening
              the app pulls the latest.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await signOut();
                  setSession(null);
                  setStatus('Signed out.');
                }}
                className="rounded-xl px-3 py-2 text-sm text-stone-400 hover:text-stone-600"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-xs text-stone-400">
              Sign in with Google — no passwords. Same account on Mac + iPad. Sync runs
              automatically after you’re signed in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={startGoogle}
                className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Continue with Google
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Export backup</h2>
          <p className="mt-1 text-xs text-stone-400">
            Optional — download or copy everything (prefs + all course progress).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportNow}
              className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={copyPayload}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-600"
            >
              Copy sync payload
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Import backup</h2>
          <p className="mt-1 text-xs text-stone-400">Choose a file or paste the payload below.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="mt-3 block w-full text-xs text-stone-500"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste sync JSON here…"
            rows={4}
            className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
          />
          <button
            type="button"
            onClick={() => doImportText(paste)}
            className="mt-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white"
          >
            Import pasted JSON
          </button>
        </div>
      </div>

      {!tipDismissed && onDismissTip && <IpadTip onDismiss={onDismissTip} />}

      <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-5 dark:border-stone-700 dark:bg-stone-900/40">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={morningPingEnabled}
            onChange={(e) => onMorningPing(e.target.checked)}
            className="mt-1 rounded border-stone-300 text-orange-600 focus:ring-orange-300"
          />
          <span>
            <span className="block text-sm font-medium text-stone-700 dark:text-stone-200">
              Morning ping (coming)
            </span>
            <span className="mt-0.5 block text-xs text-stone-400">
              Soft reminder preference saved — delivery will be enabled later.
            </span>
          </span>
        </label>
      </div>

      {status && (
        <p
          role="status"
          className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-stone-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-stone-100"
        >
          {status}
        </p>
      )}
    </section>
  );
}
