/**
 * The page's color mode, light or dark: read, set, and heard changing.
 *
 * **Kept on the document element**, as `data-color-mode`, which is the one
 * thing `helix.css` decides the mode by. Absent, the mode is the reader's
 * system setting. So a page can write it in its markup, set it from its own
 * code with `setColorMode`, or leave it to `Theme Toggle`, and all of them
 * agree.
 */

import { reducedMotion } from '../page-motion/page-motion.js'

/** A color mode. */
export type ColorMode = 'dark' | 'light'

/**
 * How the page moves from one mode to the other: the new mode spreading in a
 * circle from a point, wiping across from the inline start, fading over the
 * old one, or taking its place at once.
 */
export type ColorModeTransition = 'circle' | 'fade' | 'none' | 'wipe'

/** The attribute on the document element that holds the page's mode. */
export const COLOR_MODE_ATTRIBUTE = 'data-color-mode'

/**
 * The attribute on the document element that names the transition running,
 * which `helix.css` draws the view transition by.
 */
export const COLOR_TRANSITION_ATTRIBUTE = 'data-helix-color-transition'

/**
 * The mode a transition is on its way to, before its picture is taken and the
 * attribute written, so a second press read during it goes the other way.
 */
let heading: ColorMode | undefined

/** Which call to `setColorMode` is the latest, so only that one takes its marks off the document. */
let turn = 0

/** The page's mode: the one written on the document element, or the reader's system setting. Light on a server. */
export const colorMode = (): ColorMode => {
  if (typeof document === 'undefined') {
    return 'light'
  }
  if (heading) {
    return heading
  }
  const written = document.documentElement.getAttribute(COLOR_MODE_ATTRIBUTE)
  if (written === 'dark' || written === 'light') {
    return written
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** What `setColorMode` is told about how to move. */
export interface ColorModeOptions {
  /** How the page moves to the new mode. `circle` where this is not given. */
  transition?: ColorModeTransition

  /**
   * The point a `circle` spreads from, in viewport pixels, such as the middle
   * of the button pressed. The middle of the viewport where this is not given.
   */
  from?: { x: number; y: number }
}

/**
 * Sets the page's mode, moving to it as `transition` says.
 *
 * **The one view transition in Helix, and why it may be one.** A view
 * transition draws the whole document twice and runs between the two, so a
 * component cannot own one: two would cancel each other, and the page's own
 * would be canceled by a component's. The color mode is the document's own
 * state, which the page decides once, so changing it is the one move that is
 * the document's to make. The page's code can call this as well as the button.
 *
 * The mode is set at once, with no transition, where the reader asked for
 * reduced motion, where the browser has no view transitions, or for `none`.
 * Resolves once the page shows the new mode.
 */
export const setColorMode = async (
  mode: ColorMode,
  options: ColorModeOptions = {},
): Promise<void> => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  /* **And an inline `color-scheme`, where the page wrote one**, which outranks
     the stylesheet's rule for the attribute: the sandbox's frame writes both,
     and there the attribute turned dark while every `light-dark()` stayed
     light. A page that wrote none is left without one. */
  const apply = (): void => {
    root.setAttribute(COLOR_MODE_ATTRIBUTE, mode)
    if (root.style.colorScheme !== '') {
      root.style.colorScheme = mode
    }
  }
  const transition = options.transition ?? 'circle'
  const start = (
    document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> }
    }
  ).startViewTransition
  if (
    transition === 'none' ||
    reducedMotion() ||
    typeof start !== 'function' ||
    colorMode() === mode
  ) {
    apply()
    return
  }
  const width = innerWidth
  const height = innerHeight
  const x = options.from?.x ?? width / 2
  const y = options.from?.y ?? height / 2
  /* Far enough to reach the corner furthest from the point. */
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
  root.style.setProperty('--theme-toggle-origin-x', `${x}px`)
  root.style.setProperty('--theme-toggle-origin-y', `${y}px`)
  root.style.setProperty('--theme-toggle-radius', `${Math.ceil(radius)}px`)
  root.setAttribute(COLOR_TRANSITION_ATTRIBUTE, transition)
  heading = mode
  turn += 1
  const mine = turn
  /* **A press during a transition skips it**, the browser starting the new
     one from where the old one stood, and the old one's promises reject: the
     mode is set all the same, so a skip is no error. */
  try {
    const running = start.call(document, () => {
      heading = undefined
      apply()
    }) as { finished: Promise<void>; ready?: Promise<void> }
    running.ready?.catch(() => {})
    await running.finished.catch(() => {})
  } finally {
    /* Only the latest: an earlier one finishing as it is skipped would take
       the circle's point off the one running. */
    if (mine === turn) {
      heading = undefined
      root.removeAttribute(COLOR_TRANSITION_ATTRIBUTE)
      for (const name of [
        '--theme-toggle-origin-x',
        '--theme-toggle-origin-y',
        '--theme-toggle-radius',
      ]) {
        root.style.removeProperty(name)
      }
    }
  }
}

/**
 * Calls `listener` with the page's mode whenever it changes: the attribute on
 * the document element, or the reader's system setting while the attribute is
 * absent. Returns what stops listening.
 */
export const onColorModeChange = (listener: (mode: ColorMode) => void): (() => void) => {
  if (typeof document === 'undefined') {
    return () => {}
  }
  let last = colorMode()
  const heard = (): void => {
    const now = colorMode()
    if (now !== last) {
      last = now
      listener(now)
    }
  }
  const watcher = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(heard)
  watcher?.observe(document.documentElement, { attributeFilter: [COLOR_MODE_ATTRIBUTE] })
  const system =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined
  system?.addEventListener?.('change', heard)
  return () => {
    watcher?.disconnect()
    system?.removeEventListener?.('change', heard)
  }
}
