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

export const icons: Record<string, HelixIcon> = {
  [check.name]: check,
  [chevronDown.name]: chevronDown,
  [close.name]: close,
}
