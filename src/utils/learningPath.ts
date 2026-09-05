/** Recommended calm learning path (ordered). Framer 3.0 is related to Framer Masterclass. */
export const LEARNING_PATH_IDS: string[] = [
  'figma-for-web-designers-2-0',
  'framer-masterclass-2-0',
  'framer-3-0', // related companion
  'core-design-skills',
  'brand-design-mastery',
  'writesite-strategic-copywriting-for-web-designers',
  'web-design-masterclass',
  'web-design-becoming-a-professional',
  'freelancing-for-web-designers',
  'webflow-masterclass-5-1',
  'webflow-masterclass-5-1-pro-content',
];

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
      'web-design-becoming-a-professional',
    ],
  },
  {
    title: '5 · Freelance & Webflow',
    ids: [
      'freelancing-for-web-designers',
      'webflow-masterclass-5-1',
      'webflow-masterclass-5-1-pro-content',
    ],
  },
];

export function pathIndex(courseId: string): number {
  const i = LEARNING_PATH_IDS.indexOf(courseId);
  return i === -1 ? 999 : i;
}
