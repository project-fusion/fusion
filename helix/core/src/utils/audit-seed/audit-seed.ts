import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The seed last looked at, so a page is measured once per seed it sets. */
let audited: string | undefined

/** Whether the root is watched for a seed that arrives or changes later. */
let watching = false

/** What primary text needs against the page, as text does. */
const TEXT = 4.5

/** What a filled control needs against the page, as a graphic does. */
const FILL = 3

/** The WCAG relative luminance of three bytes. */
const luminance = (bytes: readonly number[]): number => {
  const [red = 0, green = 0, blue = 0] = bytes.map((byte) => {
    const channel = byte / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** The contrast of two colors, as three bytes each, from 1 to 21. */
export const contrastOf = (one: readonly number[], other: readonly number[]): number => {
  const [low, high] = [luminance(one), luminance(other)].sort((a, b) => a - b) as [number, number]
  return (high + 0.05) / (low + 0.05)
}

/**
 * The warning for one scheme, naming only the measures that fall under their
 * floor. It once named both floors whatever failed, and read "a filled control
 * 7.24:1 ... under 4.5:1 and 3:1" for a fill that passed.
 */
export const contrastMessage = (scheme: 'dark' | 'light', text: number, fill: number): string =>
  [
    text < TEXT
      ? `In ${scheme}, primary text measures ${text.toFixed(2)}:1 against the page, under the ${TEXT}:1 it needs.`
      : '',
    fill < FILL
      ? `In ${scheme}, a filled control measures ${fill.toFixed(2)}:1 against the page, under the ${FILL}:1 it needs.`
      : '',
    'A seed alone cannot cause this, so look for an override of `--helix-color-primary`, ' +
      '`--helix-color-primary-surface`, or the page color.',
  ]
    .filter(Boolean)
    .join(' ')

/**
 * Reports a page whose primary text or filled controls fall under their
 * contrast floor, in either color scheme.
 *
 * **The brand ramp is solved in CSS**, so a seed on its own cannot fall under
 * either floor: `primitives.css` holds the light rungs at or under L 0.5 and the
 * dark ones at or over 0.68. What can is an override of the ramp's output, such
 * as `--helix-color-primary` set by hand or a page color the solve did not
 * assume, and that is what this catches.
 *
 * **Both schemes, from probes that each name one**, since `light-dark()`
 * resolves against the element's own `color-scheme` and a page in light would
 * otherwise never be checked in dark. **Again whenever the seed changes**: a
 * theme set by script after the first element upgraded was never looked at.
 *
 * **Read off a probe**, because a custom property is handed back as the text
 * that was written, and off a canvas, which turns any color syntax into bytes. A
 * seed on a `[data-helix-theme]` element is not looked at.
 *
 * **In a development build only**, as `missing-name` is. Core imports it as
 * `#audit-seed`, which `package.json` resolves here under the `development`
 * condition and to `audit-seed-off.ts`, which does nothing, everywhere else.
 */
export const auditSeed = (): void => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  if (!watching && typeof MutationObserver !== 'undefined') {
    watching = true
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) {
        return
      }
      queued = true
      requestAnimationFrame(() => {
        queued = false
        auditSeed()
      })
    })
    /* Where a seed is set: an attribute on the root or the body, or a sheet
       added to or edited in the head. Not the whole tree, whose style
       attributes an animation can rewrite every frame. */
    const where = { attributeFilter: ['style', 'class', 'data-theme'], attributes: true }
    observer.observe(root, where)
    if (document.body) {
      observer.observe(document.body, where)
    }
    if (document.head) {
      observer.observe(document.head, { characterData: true, childList: true, subtree: true })
    }
  }
  const seed = getComputedStyle(root).getPropertyValue('--helix-seed-brand').trim()
  if (seed === '' || seed === audited) {
    return
  }
  audited = seed
  const context = document.createElement('canvas').getContext?.('2d', { willReadFrequently: true })
  if (!context) {
    return
  }
  const bytes = (value: string): number[] => {
    context.fillStyle = '#000'
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
  }
  for (const scheme of ['light', 'dark'] as const) {
    const probe = document.createElement('span')
    probe.style.cssText =
      `color-scheme:${scheme};color:var(--helix-color-primary);` +
      'background-color:var(--helix-color-background);' +
      'border-color:var(--helix-color-primary-surface);display:none'
    root.append(probe)
    const { backgroundColor, borderTopColor, color } = getComputedStyle(probe)
    probe.remove()
    const page = bytes(backgroundColor)
    const text = contrastOf(bytes(color), page)
    const fill = contrastOf(bytes(borderTopColor), page)
    if (text >= TEXT && fill >= FILL) {
      continue
    }
    reportRuntime({
      kind: 'primary-contrast',
      message: contrastMessage(scheme, text, fill),
      tag: 'html',
    })
  }
}
