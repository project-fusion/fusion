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

export const icons: Record<string, HelixIcon> = {
  [check.name]: check,
  [chevronDown.name]: chevronDown,
  [close.name]: close,
  [danger.name]: danger,
  [info.name]: info,
  [warning.name]: warning,
}
