/** Default access end for most Flux courses in this tracker */
export const DEFAULT_ACCESS_UNTIL = '2026-10-23';

const NO_DEADLINE = new Set([
  'webflow-masterclass-5-1',
  'webflow-masterclass-5-1-pro-content',
  'core-design-skills',
  'freelancing-for-web-designers',
  'web-design-becoming-a-professional',
]);

export function hasAccessDeadline(courseId: string): boolean {
  return !NO_DEADLINE.has(courseId);
}

export function accessUntilISO(courseId: string): string | null {
  return hasAccessDeadline(courseId) ? DEFAULT_ACCESS_UNTIL : null;
}

export function daysUntilAccessEnd(courseId: string, from = new Date()): number | null {
  const iso = accessUntilISO(courseId);
  if (!iso) return null;
  const end = new Date(`${iso}T23:59:59`);
  const ms = end.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatAccessLabel(courseId: string): string | null {
  if (!hasAccessDeadline(courseId)) return null;
  return 'Access until Oct 23, 2026';
}

export function calmDaysRemaining(courseId: string): string | null {
  const days = daysUntilAccessEnd(courseId);
  if (days == null) return null;
  if (days < 0) return 'Access window closed — local notes stay yours';
  if (days === 0) return 'Last day of access window';
  if (days === 1) return '1 calm day remaining';
  return `${days} calm days remaining`;
}
