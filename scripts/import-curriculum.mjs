#!/usr/bin/env bun
/**
 * Import Flux scrape JSON into a course seed TS file.
 *
 * Usage:
 *   bun scripts/import-curriculum.mjs <slug>
 *   bun scripts/import-curriculum.mjs --all
 *
 * Reads:  /workspace/flux-courses/<slug>/curriculum.json
 * Writes: src/data/courses/<slug>.ts
 *
 * Expected curriculum.json shape (flexible):
 * Flat: { id?, title, url?, modules: [...] }
 * Or scrape wrapper: { course: { id, title, url }, modules: [...], totals? }
 * Lesson duration fields: duration | durationRaw ("mm:ss"), durationMinutes (number|null)
 */


import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLUX_ROOT = '/workspace/flux-courses';
const OUT_DIR = join(ROOT, 'src/data/courses');

const TITLE_OVERRIDES = {
  'client-ready-imagery-with-magnific': 'Client-Ready Imagery with Magnific',
  'framer-3-0': 'Framer 3.0',
  'figma-motion-and-shaders': 'Figma Motion and Shaders',
  'webflow-ai': 'Webflow AI',
  'ai-web-design-sprint': 'AI Web Design Sprint',
  'freelancing-for-web-designers': 'Freelancing for Web Designers',
  'web-design-masterclass': 'Web Design Masterclass',
  'writesite-strategic-copywriting-for-web-designers':
    'WriteSite: Strategic Copywriting for Web Designers',
  'core-design-skills': 'Core Design Skills',
  'brand-design-mastery': 'Brand Design Mastery',
  'webflow-masterclass-5-1-pro-content': 'Webflow Masterclass 5.1 Pro',
  'figma-for-web-designers-2-0': 'Figma for Web Designers 2.0',
  'webflow-masterclass-5-1': 'Webflow Masterclass 5.1',
  'framer-masterclass-2-0': 'Framer Masterclass 2.0',
  'web-design-becoming-a-professional': 'Web Design: Becoming a Professional',
};

function slugToConst(slug) {
  return slug.toUpperCase().replace(/-/g, '_');
}

function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') return null;
  const parts = duration.trim().split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function durationMinutesFrom(lesson) {
  if (typeof lesson.durationMinutes === 'number' && Number.isFinite(lesson.durationMinutes) && lesson.durationMinutes >= 0) {
    return Math.max(1, Math.ceil(lesson.durationMinutes));
  }
  const secs = parseDuration(lesson.duration || lesson.durationRaw);
  if (secs != null) return Math.max(1, Math.ceil(secs / 60));
  // Null/missing duration (e.g. AI Sprint): sensible Watch default
  return 10;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'item';
}

/** Pull actionable lines + URLs from lesson description / links. */
function extractActionSubtasks(lesson, lessonId, watchMinutes) {
  const subtasks = [
    {
      id: `${lessonId}-watch`,
      label: 'Watch lesson',
      estimatedMinutes: watchMinutes,
      completed: false,
      actualMinutes: null,
      timerStartedAt: null,
    },
  ];

  const seen = new Set();
  const add = (label, url, minutes = 5) => {
    const key = `${label}||${url || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    const id = `${lessonId}-${slugify(label)}`;
    const task = {
      id,
      label: label.slice(0, 120),
      estimatedMinutes: minutes,
      completed: false,
      actualMinutes: null,
      timerStartedAt: null,
    };
    if (url) task.url = url;
    subtasks.push(task);
  };

  const desc = lesson.description || '';
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const lines = desc.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const urls = [...line.matchAll(urlRegex)].map((m) => m[1].replace(/[.,;:]+$/, ''));
    const actionMatch = line.match(
      /^(download|get|install|open|visit|bookmark|join|create|copy|read|check|grab|sign\s*up|watch|follow|use|import|export|duplicate|clone|start|complete|submit|share|review)\b[:\s-]*(.+)$/i,
    );
    if (actionMatch) {
      let label = line.replace(urlRegex, '').replace(/\s+/g, ' ').replace(/[:\s-]+$/, '').trim();
      if (label.length < 4) label = actionMatch[0].slice(0, 80);
      add(label, urls[0], 5);
      continue;
    }
    // "Label: https://..."
    const labeled = line.match(/^(.{3,80}?):\s*(https?:\/\/\S+)/i);
    if (labeled) {
      add(labeled[1].replace(/^👉\s*/, '').trim(), labeled[2].replace(/[.,;:]+$/, ''), 4);
      continue;
    }
    // Bare URL with preceding words on same line
    if (urls.length && line.length < 140) {
      const label = line.replace(urlRegex, '').replace(/[:\s-]+$/, '').trim() || 'Open resource link';
      add(label, urls[0], 3);
    }
  }

  const links = Array.isArray(lesson.links) ? lesson.links : [];
  for (const link of links) {
    const url = link.url || link.href;
    if (!url) continue;
    const label = (link.label || link.title || 'Open resource').trim();
    add(label, url, 4);
  }

  // Practice / notes fallback when only Watch exists
  if (subtasks.length === 1) {
    add('Practice / take notes', undefined, 10);
  }

  return subtasks;
}

function normalizeModule(mod, index) {
  const number =
    typeof mod.number === 'number'
      ? mod.number
      : typeof mod.order === 'number'
        ? mod.order
        : index + 1;
  const id = mod.id || `m${number}`;
  const lessons = (mod.lessons || []).map((lesson, li) => {
    const lessonId = lesson.id || `${id}-l${li + 1}`;
    const durationRaw = lesson.duration || lesson.durationRaw || '';
    const durationMinutes = durationMinutesFrom(lesson);
    const duration =
      durationRaw ||
      `${String(Math.floor(durationMinutes)).padStart(1, '0')}:00`;
    return {
      id: lessonId,
      title: lesson.title || `Lesson ${li + 1}`,
      duration,
      durationMinutes,
      description: lesson.description || '',
      completed: false,
      subtasks: extractActionSubtasks(lesson, lessonId, durationMinutes),
    };
  });
  return {
    id,
    number,
    title: mod.title || `Module ${number}`,
    lessons,
  };
}

function buildCourse(slug, raw) {
  // Support both flat scrapes and { course, modules, totals } shape
  const meta = raw.course && typeof raw.course === 'object' ? raw.course : raw;
  const title =
    meta.title ||
    raw.title ||
    TITLE_OVERRIDES[slug] ||
    slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const url = meta.url || raw.url || `https://community.flux-academy.com/c/${slug}`;
  const modules = (raw.modules || []).map(normalizeModule);
  return {
    id: meta.id || raw.id || slug,
    title: TITLE_OVERRIDES[slug] || title,
    url,
    comingSoon: modules.length === 0 ? true : undefined,
    modules,
  };
}

function toTs(slug, course) {
  const constName = slugToConst(slug);
  const body = JSON.stringify(
    {
      id: course.id,
      title: course.title,
      url: course.url,
      ...(course.comingSoon ? { comingSoon: true } : {}),
      modules: course.modules,
    },
    null,
    2,
  );
  return `import type { CourseData } from '../../types';\n\nexport const ${constName}: CourseData = ${body};\n`;
}

function ensureIndexHasCourse(slug) {
  const indexPath = join(OUT_DIR, 'index.ts');
  let src = readFileSync(indexPath, 'utf8');
  const constName = slugToConst(slug);
  const importLine = `import { ${constName} } from './${slug}';`;
  if (!src.includes(importLine) && !src.includes(`'./${slug}'`) && !src.includes(`"./${slug}"`)) {
    // Insert import after last import
    const lines = src.split('\n');
    let lastImport = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImport = i;
    }
    lines.splice(lastImport + 1, 0, importLine);
    src = lines.join('\n');
  }
  if (!src.includes(constName + ',')) {
    src = src.replace(
      /export const COURSES: CourseData\[\] = \[/,
      `export const COURSES: CourseData[] = [\n  ${constName},`,
    );
  }
  writeFileSync(indexPath, src);
}

function importSlug(slug) {
  const jsonPath = join(FLUX_ROOT, slug, 'curriculum.json');
  if (!existsSync(jsonPath)) {
    console.warn(`skip ${slug}: missing ${jsonPath}`);
    return false;
  }
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const course = buildCourse(slug, raw);
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${slug}.ts`);
  writeFileSync(outPath, toTs(slug, course));
  ensureIndexHasCourse(slug);
  const lessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  console.log(`wrote ${outPath} (${course.modules.length} modules, ${lessons} lessons)`);
  return true;
}

function listAvailableSlugs() {
  if (!existsSync(FLUX_ROOT)) return [];
  return readdirSync(FLUX_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((slug) => existsSync(join(FLUX_ROOT, slug, 'curriculum.json')));
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(`Usage:
  bun scripts/import-curriculum.mjs <slug>
  bun scripts/import-curriculum.mjs --all

Flux root: ${FLUX_ROOT}
`);
  process.exit(args.includes('--help') ? 0 : 1);
}

if (args.includes('--all')) {
  const slugs = listAvailableSlugs();
  if (!slugs.length) {
    console.log(`No curriculum.json files under ${FLUX_ROOT}`);
    process.exit(0);
  }
  let ok = 0;
  for (const slug of slugs) if (importSlug(slug)) ok += 1;
  console.log(`Imported ${ok}/${slugs.length}`);
} else {
  const slug = basename(args[0].replace(/\/$/, ''));
  const ok = importSlug(slug);
  process.exit(ok ? 0 : 1);
}
