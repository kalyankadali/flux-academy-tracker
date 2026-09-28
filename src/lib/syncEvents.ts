export const FLUX_LOCAL_CHANGED = 'flux-local-changed';
export const FLUX_CLOUD_APPLIED = 'flux-cloud-applied';

let suppressNotify = 0;

/** Skip auto-push notifies while applying a cloud pull/push bookkeeping write. */
export function withSyncQuiet<T>(fn: () => T): T {
  suppressNotify += 1;
  try {
    return fn();
  } finally {
    suppressNotify -= 1;
  }
}

/** Fire after local prefs/course progress is saved so auto-push can debounce. */
export function notifyFluxLocalChanged(): void {
  if (typeof window === 'undefined') return;
  if (suppressNotify > 0) return;
  window.dispatchEvent(new Event(FLUX_LOCAL_CHANGED));
}

/** Fire after a cloud pull wrote newer progress into localStorage — remount/refresh UI. */
export function notifyFluxCloudApplied(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FLUX_CLOUD_APPLIED));
}
