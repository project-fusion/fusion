/**
 * Helix icon set.
 *
 * Icons are data, not components: a raw path string plus a viewBox, so any tier
 * can render them without pulling in a rendering dependency.
 */
export interface HelixIcon {
  name: string
  path: string
  viewBox: string
}

const icon = (name: string, path: string): HelixIcon => ({ name, path, viewBox: '0 0 24 24' })

export const chevronDown = icon('chevron-down', 'M6 9l6 6 6-6')
export const check = icon('check', 'M20 6L9 17l-5-5')
export const close = icon('close', 'M18 6L6 18M6 6l12 12')
export const info = icon('info', 'M12 22a10 10 0 100-20 10 10 0 000 20M12 16v-4M12 8h.01')
export const warning = icon(
  'warning',
  'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0M12 9v4M12 17h.01',
)
export const danger = icon('danger', 'M12 22a10 10 0 100-20 10 10 0 000 20M15 9l-6 6M9 9l6 6')
export const gear = icon(
  'gear',
  'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1',
)

export const icons: Record<string, HelixIcon> = {
  [check.name]: check,
  [chevronDown.name]: chevronDown,
  [close.name]: close,
  [danger.name]: danger,
  [gear.name]: gear,
  [info.name]: info,
  [warning.name]: warning,
}
