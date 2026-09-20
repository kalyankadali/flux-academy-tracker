/** Asia/Calcutta deep-work windows for Kalyan day spine. */
export type FluxWindow = 'deep' | 'light' | 'wind_down' | 'off'

export function kolkataMinutes(d = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Calcutta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

/**
 * Deep: 7:00–8:30 cabin · 11:00–15:00 home office · 15:30–18:00 cabin afternoon.
 * Light: other waking hours before 18:00 (includes 15:00–15:30 travel to cabin).
 * Wind-down: 18:00–22:00 (walk at cabin, home dinner, evening tasks, Zebra).
 */
export function getFluxWindow(now = new Date()): FluxWindow {
  const m = kolkataMinutes(now)
  const deepMorning = m >= 7 * 60 && m < 8 * 60 + 30
  const deepHome = m >= 11 * 60 && m < 15 * 60
  const deepCabinPm = m >= 15 * 60 + 30 && m < 18 * 60
  if (deepMorning || deepHome || deepCabinPm) return 'deep'
  if (m >= 18 * 60 && m < 22 * 60) return 'wind_down'
  if (m >= 4 * 60 && m < 18 * 60) return 'light'
  return 'off'
}

export function fluxWindowCopy(w: FluxWindow): { title: string; body: string } {
  switch (w) {
    case 'deep':
      return {
        title: 'Deep block',
        body: 'This lesson — or nothing. Stay with the one task.',
      }
    case 'light':
      return {
        title: 'Between blocks',
        body: 'Day spine first. Deep Flux: 7:00 cabin, 11:00 home office, 3:30 cabin again.',
      }
    case 'wind_down':
      return {
        title: 'Wind down',
        body: 'Walk at cabin, home for dinner, then evening tasks & Zebra Learn. No more Flux grind.',
      }
    default:
      return {
        title: 'Rest',
        body: 'Sleep. The plan continues tomorrow.',
      }
  }
}

/** Calm copy for 40-day plan banner (IST deep windows). */
export const FLUX_DEEP_BLOCKS_HINT =
  'Spreads remaining path lessons evenly from tomorrow through Oct 22 (IST). Open Flux in 7:00–8:30 cabin, 11:00–15:00 home office, and 15:30–18:00 cabin.'
