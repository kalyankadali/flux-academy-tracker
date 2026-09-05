# Flux Academy Tracker — calm multi-course second brain

Soft progress tracker for the Flux Academy library. Vite + React + TypeScript + Tailwind v4 · Bun.

## Run

```bash
cd /workspace/figma-course-tracker
bun install
bun run dev
```

## Build

```bash
bun run build
```

## What’s included

### Courses & import
- Seeds under `src/data/courses/` (including **Web Design: Becoming a Professional**).
- Import / refresh from scrapes:

```bash
bun run import:curriculum -- <slug>
bun run import:curriculum -- --all
```

Reads `/workspace/flux-courses/<slug>/curriculum.json` → writes `src/data/courses/<slug>.ts`.

### Theme
- Light / dark toggle (persisted).
- Primary accent: calm orange (buttons, progress, focus rings). Soft neutrals otherwise.

### Focus & clutter
- Home shows pinned + a small set (≈4); **Show all courses** expands.
- Star/pin one primary course (default focus for “Do this next”).
- Access windows: most courses **Access until Oct 23, 2026** with calm days-remaining.
- **No deadline:** `webflow-masterclass-5-1`, `webflow-masterclass-5-1-pro-content`, `core-design-skills`, `freelancing-for-web-designers`.

### Do this next (queue of 3)
- Shows **3** priority lessons with labels like **Module 2 · Lesson 3**.
- Prefers pinned course, else next incomplete on the learning path.
- Tick off or complete the lesson; when all 3 are done, the next batch loads.
- Queue position persisted in prefs (`flux-course-tracker:prefs:v2`).

### Today / Upcoming / Calendar
- Notion-inspired top tabs: **Home · Today · Upcoming · Calendar · Sync**.
- **Today:** scheduled items, streak, queue, optional planner suggestions.
- **Upcoming:** dated lessons + access windows.
- **Calendar:** assign target dates to lessons; dots per day. Schedule in localStorage.

### Learning path
1. Figma for Web Designers  
2. Framer Masterclass (+ Framer 3.0 related)  
3. Core Design Skills  
4. Brand Design Mastery, WriteSite, Web Design Masterclass, Web Design: Becoming a Professional  
5. Freelancing, Webflow Masterclass, Webflow Masterclass Pro  

### Quotes
- Short motivational line + plain-English one-liner when helpful.

### Sync (cross-device MVP)
1. Progress always autosaves in **localStorage** (per-course + prefs).
2. Each install has a **Sync code** (UUID) — copy from the Sync tab.
3. **Export / Import** JSON (download file or copy/paste payload) — reliable iPad ↔ Mac path (AirDrop / email yourself the file).
4. **Optional cloud:** set `VITE_JSONBIN_API_KEY` (and optionally `VITE_JSONBIN_BIN_ID`) for Push/Pull via JSONBin. Without a key, Sync tab explains export/import.

Keys:
- Prefs: `flux-course-tracker:prefs:v2`
- Course progress: `flux-course-tracker:v1:<courseId>`
- Legacy `figma-course-tracker-v1` still migrates into the Figma course.

### Tone
Calm and encouraging — no “you’re behind.”

## Stack

Vite + React 18 + TypeScript + Tailwind CSS v4 · Bun
