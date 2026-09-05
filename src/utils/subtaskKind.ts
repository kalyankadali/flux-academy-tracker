import type { Subtask, SubtaskKind } from '../types';

export function classifySubtask(sub: Subtask): SubtaskKind {
  const label = sub.label.toLowerCase();
  if (label.includes('watch')) return 'watch';
  if (label.includes('download') || label.includes('get ') || label.includes('install') || label.includes('bookmark'))
    return 'download';
  if (label.includes('practice') || label.includes('exercise') || label.includes('build') || label.includes('take notes'))
    return 'practice';
  return 'other';
}

export function kindLabel(kind: SubtaskKind): string {
  switch (kind) {
    case 'watch':
      return 'Watch';
    case 'download':
      return 'Download';
    case 'practice':
      return 'Practice';
    default:
      return 'Task';
  }
}
