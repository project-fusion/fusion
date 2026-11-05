import { reportRuntime } from '../report-runtime/report-runtime.js'

/**
 * The seed last looked at, so an element that upgrades measures only a new
 * seed. An empty string is the default ink theme, which has no seed.
 */
let audited: string | undefined

/** Whether the root, the body, or the head changed since the last measure. */
let changed = false

/** What the last measure read, so a change that moves no color reports nothing. */
let measured: string | undefined

/** Every warning printed, so a page that switches back and forth prints each once. */
const reported = new Set<string>()

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
 * The scheme a page color belongs to: light when black text on it measures
 * more than white text does.
 */
export const schemeOf = (page: readonly number[]): 'dark' | 'light' =>
  contrastOf(page, [0, 0, 0]) > contrastOf(page, [255, 255, 255]) ? 'light' : 'dark'

/** One scheme's colors as bytes: the page, primary text, and a primary fill. */
type Probe = {
  fill: number[]
  page: number[]
  scheme: 'dark' | 'light'
  text: number[]
}

/** The canvas that turns a computed color into bytes, made on the first measure. */
let context: CanvasRenderingContext2D | null | undefined

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
 * otherwise never be checked in dark. **A page that sets its colors per scheme
 * at the root**, as the Fusion site does with `lab(100 0 0)` in light and
 * `lab(0 0 0)` in dark, hands both probes the same colors. Those colors are the
 * scheme the page shows, named by the page color, and the other scheme is
 * measured when the page switches to it. The probes once named both, so a
 * `#fff59d` primary on the light page read "In dark ... 1.12:1".
 *
 * **Again whenever the seed changes or the root, the body, or the head does**: a
 * theme set by script after the first element upgraded was never looked at, and
 * an override of `--helix-color-primary` set after the seed printed nothing,
 * since the audit stopped at a seed it had seen.
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
    const queue = (): void => {
      changed = true
      if (queued) {
        return
      }
      queued = true
      requestAnimationFrame(() => {
        queued = false
        auditSeed()
      })
    }
    /* A sheet added to the head is seen before it loads, so its colors are
       measured again once it has. */
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLLinkElement) {
            node.addEventListener('load', queue, { once: true })
          }
        }
      }
      queue()
    })
    /* A page that follows the system's scheme switches with no attribute
       changing. */
    globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', queue)
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
  /* An empty seed is measured too. The default ink theme sets none, and an
     override of `--helix-color-primary` to `#eeeeee` on it measured 1.16:1 and
     printed nothing while the audit returned on an empty seed. */
  const seed = getComputedStyle(root).getPropertyValue('--helix-seed-brand').trim()
  if (seed === audited && !changed) {
    return
  }
  audited = seed
  changed = false
  context ??= document.createElement('canvas').getContext?.('2d', { willReadFrequently: true })
  if (!context) {
    return
  }
  const pen = context
  const bytes = (value: string): number[] => {
    pen.fillStyle = '#000'
    pen.fillStyle = value
    pen.fillRect(0, 0, 1, 1)
    return [...pen.getImageData(0, 0, 1, 1).data].slice(0, 3)
  }
  const [light, dark] = (['light', 'dark'] as const).map((scheme) => {
    const probe = document.createElement('span')
    probe.style.cssText =
      `color-scheme:${scheme};color:var(--helix-color-primary);` +
      'background-color:var(--helix-color-background);' +
      'border-color:var(--helix-color-primary-surface);display:none'
    root.append(probe)
    const { backgroundColor, borderTopColor, color } = getComputedStyle(probe)
    probe.remove()
    return { fill: bytes(borderTopColor), page: bytes(backgroundColor), scheme, text: bytes(color) }
  }) as [Probe, Probe]
  const key = JSON.stringify([light, dark])
  if (key === measured) {
    return
  }
  measured = key
  const probes =
    JSON.stringify([light.fill, light.page, light.text]) ===
    JSON.stringify([dark.fill, dark.page, dark.text])
      ? [{ ...light, scheme: schemeOf(light.page) }]
      : [light, dark]
  for (const { fill, page, scheme, text } of probes) {
    const textContrast = contrastOf(text, page)
    const fillContrast = contrastOf(fill, page)
    if (textContrast >= TEXT && fillContrast >= FILL) {
      continue
    }
    const message = contrastMessage(scheme, textContrast, fillContrast)
    if (reported.has(message)) {
      continue
    }
    reported.add(message)
    reportRuntime({ kind: 'primary-contrast', message, tag: 'html' })
  }
}
