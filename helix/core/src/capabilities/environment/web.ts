import { isRtl } from '../../utils/is-rtl/is-rtl.js'
import { reducedMotion } from '../../utils/page-motion/page-motion.js'
import type { Conditions } from '../types.generated.js'
import type { Environment } from './contract.generated.js'
import { conditionsMoved, NO_INSETS } from './moved.js'

const REDUCE = '(prefers-reduced-motion: reduce)'
const DARK = '(prefers-color-scheme: dark)'

/** The element whose padding is the safe area, made at the first read. */
let probe: HTMLElement | undefined

/** A length the browser computed, in pixels, or 0 where it computed none. */
const pixels = (length: string): number => {
  const parsed = Number.parseFloat(length)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The safe area, as `env(safe-area-inset-*)` gives it: the padding of a
 * fixed, hidden element padded by the four. A page without
 * `viewport-fit=cover` has none to keep clear of, and reads 0 on each edge.
 */
const insets = (): Conditions['insets'] => {
  if (document.body === null) {
    return { ...NO_INSETS }
  }
  if (probe === undefined || !probe.isConnected) {
    probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText =
      'position:fixed;inset:0 auto auto 0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left)'
    document.body.append(probe)
  }
  const style = getComputedStyle(probe)
  return {
    bottom: pixels(style.paddingBottom),
    left: pixels(style.paddingLeft),
    right: pixels(style.paddingRight),
    top: pixels(style.paddingTop),
  }
}

/** What the browser says now. */
const read = (): Conditions => ({
  colorScheme: matchMedia(DARK).matches ? 'dark' : 'light',
  direction: isRtl(document.documentElement) ? 'rtl' : 'ltr',
  fontScale: 1,
  insets: insets(),
  platform: 'web',
  reducedMotion: reducedMotion(),
  screenReader: false,
  window: { height: innerHeight, width: innerWidth },
})

/**
 * Reads the browser: `prefers-reduced-motion` and `prefers-color-scheme`
 * through `matchMedia`, the direction of the document element, a font scale
 * of 1, the platform `web`, the window's `innerWidth` and `innerHeight`, and
 * the safe area from `env(safe-area-inset-*)`.
 *
 * **The screen reader is always `false`.** A browser does not tell a page
 * whether one is on.
 *
 * **The direction is the computed one, as `isRtl` reads it**, so a sheet that
 * sets `direction` on the document element counts as well as its `dir`.
 *
 * **The font scale is 1, because the browser scales its own text.** The
 * reader's text size reaches every `rem` and `em` on the page through the
 * browser, so a component that multiplied by it would scale the text twice.
 *
 * `observe` listens to both media queries, to the document element's `dir`,
 * and to the window's `resize`, which a turned phone sends as its safe area
 * moves. It calls `changed` only where what it reads has moved, so a `dir`
 * written again with the same value calls nothing.
 */
export const webEnvironment: Environment = {
  observe: (changed) => {
    let last = read()
    const check = (): void => {
      const now = read()
      if (conditionsMoved(now, last)) {
        last = now
        changed({ ...now })
      }
    }
    const queries = [matchMedia(REDUCE), matchMedia(DARK)]
    for (const query of queries) {
      query.addEventListener('change', check)
    }
    const direction = new MutationObserver(check)
    direction.observe(document.documentElement, { attributeFilter: ['dir'], attributes: true })
    addEventListener('resize', check)
    return () => {
      removeEventListener('resize', check)
      for (const query of queries) {
        query.removeEventListener('change', check)
      }
      direction.disconnect()
    }
  },
  read,
}
