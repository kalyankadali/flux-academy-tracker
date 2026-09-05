import { useRef, useState } from 'react';
import type { AppPrefs } from '../types';
import {
  applySyncPayload,
  buildSyncPayload,
  cloudPull,
  cloudPush,
  copyText,
  downloadSyncFile,
  hasJsonBinKey,
  parseSyncJson,
} from '../lib/sync';
import { loadPrefs } from '../utils/prefs';

interface Props {
  prefs: AppPrefs;
  onImported: (prefs: AppPrefs) => void;
  onMarkSynced: (remoteBlobId?: string | null) => void;
}

export function SyncPanel({ prefs, onImported, onMarkSynced }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloudReady = hasJsonBinKey();

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

  const copySyncId = async () => {
    const ok = await copyText(prefs.syncId);
    setStatus(ok ? 'Sync code copied.' : 'Could not copy sync code.');
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

  const pushCloud = async () => {
    setBusy(true);
    const payload = buildSyncPayload(prefs);
    const res = await cloudPush(payload);
    setBusy(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    onMarkSynced(res.binId);
    setStatus(`Cloud backup saved (bin ${res.binId.slice(0, 8)}…).`);
  };

  const pullCloud = async () => {
    const binId = prefs.remoteBlobId || (import.meta.env.VITE_JSONBIN_BIN_ID as string | undefined);
    if (!binId) {
      setStatus('No remote bin id yet — push once from this device first, or set VITE_JSONBIN_BIN_ID.');
      return;
    }
    setBusy(true);
    const res = await cloudPull(binId);
    setBusy(false);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    const applied = applySyncPayload(res.payload);
    if (!applied.ok) {
      setStatus(applied.error);
      return;
    }
    onImported(loadPrefs());
    onMarkSynced(binId);
    setStatus('Pulled latest from cloud.');
  };

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
          Progress always saves in this browser. To move between iPad and Mac, export a sync file (or
          copy the payload) and import it on the other device. Optional cloud needs a JSONBin API key
          in env.
        </p>
      </header>

      <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-5 dark:border-orange-900/40 dark:bg-orange-950/20">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-300">
          Your sync code
        </p>
        <p className="mt-2 break-all font-mono text-sm text-stone-800 dark:text-stone-100">{prefs.syncId}</p>
        <button
          type="button"
          onClick={copySyncId}
          className="mt-3 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-medium text-white"
        >
          Copy sync code
        </button>
        {prefs.lastSyncAt && (
          <p className="mt-2 text-xs text-stone-400">
            Last sync:{' '}
            {new Date(prefs.lastSyncAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Export</h2>
          <p className="mt-1 text-xs text-stone-400">
            Download or copy everything (prefs + all course progress).
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
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Import</h2>
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
            className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs dark:border-stone-700 dark:bg-stone-800"
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

      <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Optional cloud</h2>
        {cloudReady ? (
          <>
            <p className="mt-1 text-xs text-stone-400">
              JSONBin key detected. Push from one device, pull on the other (same bin id).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={pushCloud}
                className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Push to cloud
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={pullCloud}
                className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-200 disabled:opacity-50 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-600"
              >
                Pull from cloud
              </button>
            </div>
            {prefs.remoteBlobId && (
              <p className="mt-2 break-all font-mono text-xs text-stone-400">Bin: {prefs.remoteBlobId}</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Connect sync for auto cross-device: set{' '}
            <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">VITE_JSONBIN_API_KEY</code>{' '}
            (optional{' '}
            <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">VITE_JSONBIN_BIN_ID</code>
            ). Until then, Export / Import is the reliable iPad ↔ Mac path. Email yourself the file or
            AirDrop it.
          </p>
        )}
      </div>

      {status && (
        <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {status}
        </p>
      )}
    </section>
  );
}
