/** Recommended calm learning path (ordered). Framer 3.0 is related to Framer Masterclass. */
export const LEARNING_PATH_IDS: string[] = [
  'figma-for-web-designers-2-0',
  'framer-masterclass-2-0',
  'framer-3-0', // related companion
  'core-design-skills',
  'brand-design-mastery',
  'writesite-strategic-copywriting-for-web-designers',
  'web-design-masterclass',
  'ecommerce-ai-sprint',
  'webflow-ai',
  'client-ready-imagery-with-magnific',
];

/** Excluded from aggregate Learning path % (still on path / 40-day plan). Empty: no-deadline long courses were removed from the path. */
export const AGGREGATE_PATH_EXCLUDE = new Set<string>([]);

export const AGGREGATE_PATH_IDS = LEARNING_PATH_IDS.filter((id) => !AGGREGATE_PATH_EXCLUDE.has(id));

export const LEARNING_PATH_GROUPS: { title: string; ids: string[] }[] = [
  { title: '1 · Foundations in Figma', ids: ['figma-for-web-designers-2-0'] },
  {
    title: '2 · Interactive design (Framer)',
    ids: ['framer-masterclass-2-0', 'framer-3-0'],
  },
  { title: '3 · Core craft', ids: ['core-design-skills'] },
  {
    title: '4 · Brand, copy & web design',
    ids: [
      'brand-design-mastery',
      'writesite-strategic-copywriting-for-web-designers',
      'web-design-masterclass',
    ],
  },
  {
    title: '5 · Ecommerce AI Sprint & finishers',
    ids: [
      'ecommerce-ai-sprint',
      'webflow-ai',
      'client-ready-imagery-with-magnific',
    ],
  },
];

export function pathIndex(courseId: string): number {
  const i = LEARNING_PATH_IDS.indexOf(courseId);
  return i === -1 ? 999 : i;
}
