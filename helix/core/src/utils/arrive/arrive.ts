import { reducedMotion } from '../page-motion/page-motion.js'

/** How `arrive` moves an element in. */
export interface ArriveOptions {
  /** The duration token, such as `--helix-duration-normal`. */
  duration: string
  /** The easing token, such as `--helix-easing-decelerate`. */
  easing: string
  /** Where the element starts from; it ends where its stylesheet has it. */
  from: Keyframe
}

/**
 * Brings an element in from `from` to where its stylesheet has it, **a frame
 * after it joined the page**, for an element a stylesheet's `@starting-style`
 * cannot reach: one a parent assigns to a slot by hand once it has arrived,
 * which has no style at all until then, so its first style is its last.
 *
 * In that frame the element is styled and not yet painted, so it is never
 * seen in its place before it moves. The time and the curve are the tokens
 * named, read then, so a tier with no tokens, or a reader who asked for less
 * motion, gets no move.
 */
export const arrive = (element: HTMLElement, options: ArriveOptions): void => {
  if (typeof requestAnimationFrame !== 'function' || typeof element.animate !== 'function') {
    return
  }
  requestAnimationFrame(() => {
    if (!element.isConnected || reducedMotion()) {
      return
    }
    const style = getComputedStyle(element)
    const written = style.getPropertyValue(options.duration).trim()
    const amount = Number.parseFloat(written)
    const duration = written.endsWith('ms') ? amount : amount * 1000
    if (!(duration >= 1)) {
      return
    }
    element.animate([options.from, {}], {
      duration,
      easing: style.getPropertyValue(options.easing).trim() || 'ease-out',
    })
  })
}
