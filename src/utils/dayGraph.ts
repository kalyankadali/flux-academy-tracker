/**
 * Shared day graph shape (Clear Home ↔ Flux) — read from clear_home_snapshots
 * and soft-cached in Flux prefs. Same fields Clear Home writes.
 */
export type DayGraphBlockStart = {
  phase: string
  startedAt: string
  plannedStartMin: number
  actualStartMin: number
}

export type SharedDayGraph = {
  version: 1
  dateKey: string
  blockStarts: Record<string, DayGraphBlockStart>
  softPlan: Record<string, number>
  fluxDone: boolean
  finishesToday: number
  fluxMinutesHint: number
  tomorrowLinchpin: string | null
  lifeDerailed: boolean
  fluxLessonKey: string | null
  fluxTitle: string | null
  cabinMode: 'heading' | 'arrived' | null
  lateStart: boolean
  dropOffMode?: boolean
  energyMood?: 'low' | 'ok' | 'high' | null
  energyPackMinutes?: number | null
  updatedAt: string
}

export function normalizeDayGraph(raw: unknown, _dateKey?: string): SharedDayGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  // Accept yesterday's linchpin greeting even if dateKey is today —
  // Clear Home check-out writes tomorrowLinchpin for the next IST day.
  const graphDate = typeof o.dateKey === 'string' ? o.dateKey : ''
  if (!graphDate) return null
  return {
    version: 1,
    dateKey: graphDate,
    blockStarts:
      o.blockStarts && typeof o.blockStarts === 'object'
        ? (o.blockStarts as Record<string, DayGraphBlockStart>)
        : {},
    softPlan:
      o.softPlan && typeof o.softPlan === 'object' ? (o.softPlan as Record<string, number>) : {},
    fluxDone: !!o.fluxDone,
    finishesToday: typeof o.finishesToday === 'number' ? o.finishesToday : 0,
    fluxMinutesHint: typeof o.fluxMinutesHint === 'number' ? o.fluxMinutesHint : 0,
    tomorrowLinchpin: typeof o.tomorrowLinchpin === 'string' ? o.tomorrowLinchpin : null,
    lifeDerailed: !!o.lifeDerailed,
    fluxLessonKey: typeof o.fluxLessonKey === 'string' ? o.fluxLessonKey : null,
    fluxTitle: typeof o.fluxTitle === 'string' ? o.fluxTitle : null,
    cabinMode:
      o.cabinMode === 'heading' || o.cabinMode === 'arrived' ? o.cabinMode : null,
    lateStart: !!o.lateStart,
    dropOffMode: !!o.dropOffMode,
    energyMood:
      o.energyMood === 'low' || o.energyMood === 'ok' || o.energyMood === 'high'
        ? o.energyMood
        : null,
    energyPackMinutes: typeof o.energyPackMinutes === 'number' ? o.energyPackMinutes : null,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  }
}

/** Prefer today's graph; else yesterday's linchpin for greeting. */
export function linchpinForToday(
  graph: SharedDayGraph | null,
  todayISO: string,
  yesterdayISO: string,
): string | null {
  if (!graph) return null
  if (graph.dateKey === todayISO && graph.tomorrowLinchpin) {
    // Unusual — linchpin is "tomorrow" from check-out; if same-day, still show
    return graph.tomorrowLinchpin
  }
  if (graph.dateKey === yesterdayISO && graph.tomorrowLinchpin) {
    return graph.tomorrowLinchpin
  }
  return null
}

export const CLEAR_HOME_BASE = 'https://clear-home-live.vercel.app'

export function clearHomeDayPulseUrl(base = CLEAR_HOME_BASE): string {
  return `${base.replace(/\/$/, '')}/?pulse=1`
}

export function clearHomeClockUrl(base = CLEAR_HOME_BASE): string {
  return `${base.replace(/\/$/, '')}/day`
}

export function clearHomeRecoveryUrl(base = CLEAR_HOME_BASE): string {
  return `${base.replace(/\/$/, '')}/?pulse=1&recovery=1`
}
