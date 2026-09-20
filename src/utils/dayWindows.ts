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
 * Deep: 7:00–8:30 cabin + 11:00–18:00 home office.
 * Light: other waking hours before 18:00.
 * Wind-down: 18:00–22:00 (includes 6–7 PM walk).
 */
export function getFluxWindow(now = new Date()): FluxWindow {
  const m = kolkataMinutes(now)
  if ((m >= 7 * 60 && m < 8 * 60 + 30) || (m >= 11 * 60 && m < 18 * 60)) {
    return 'deep'
  }
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
        body: 'Day spine first. Deep Flux returns at 7:00 and 11:00.',
      }
    case 'wind_down':
      return {
        title: 'Wind down',
        body: 'Dinner, meds, walk, then evening tasks & Zebra Learn. No more Flux grind.',
      }
    default:
      return {
        title: 'Rest',
        body: 'Sleep. The plan continues tomorrow.',
      }
  }
}
