/**
 * Changing the page in place as one page settling into the next, for a site
 * whose router changes the page without loading a new document.
 *
 * A site whose links load a new document needs none of this: importing
 * `page-transitions.css` from `@fusion.dev/helix-styles` on each page is the
 * whole of it.
 */

import { reducedMotion } from '../page-motion/page-motion.js'

/**
 * How the page moves to the next: fading over it, sliding in from the inline
 * end, sliding in from the inline start for a step back, or taking its place at
 * once.
 */
export type PageTransition = 'fade' | 'none' | 'slide' | 'slide-back'

/**
 * The attribute on the document element that names how the page moves, which
 * `page-transitions.css` draws the view transition by. A page that loads a new
 * document writes it in its markup; `changePage` writes it for the change it
 * makes and takes it off again.
 */
export const PAGE_TRANSITION_ATTRIBUTE = 'data-page-transition'

/** What `changePage` is told about how to move. */
export interface PageChangeOptions {
  /**
   * How the page moves. Where this is not given, the way the document element
   * already names, or a fade.
   */
  transition?: PageTransition
}

/** Which call to `changePage` is the latest, so only that one puts the attribute back. */
let turn = 0

/**
 * Runs `update`, which changes the page in place, such as a router drawing the
 * next route, as a view transition between the page before and the page
 * after. Resolves once the move has finished, and rejects where `update` does.
 *
 * **Started by the page's own code, which is why Helix may offer it.** A
 * component never starts a view transition, which draws the whole document:
 * the page is the one owner of that. This runs one only when the page asks.
 *
 * `update` runs at once, with no transition, where the reader asked for
 * reduced motion, where the browser has no view transitions, or for `none`.
 * A change made while another is moving skips the first to where it stood.
 * The moves themselves are drawn by `page-transitions.css`; without that sheet
 * the browser's own fade runs.
 */
export const changePage = async (
  update: () => unknown,
  options: PageChangeOptions = {},
): Promise<void> => {
  const start = typeof document === 'undefined' ? undefined : document.startViewTransition
  if (options.transition === 'none' || reducedMotion() || typeof start !== 'function') {
    await update()
    return
  }
  const root = document.documentElement
  const before = root.getAttribute(PAGE_TRANSITION_ATTRIBUTE)
  if (options.transition) {
    root.setAttribute(PAGE_TRANSITION_ATTRIBUTE, options.transition)
  }
  turn += 1
  const mine = turn
  try {
    const running = start.call(document, async () => {
      await update()
    })
    /* A skipped move rejects these, and the page has changed all the same.
       Caught before the update is awaited, so an update that throws leaves no
       rejection unheard. */
    running.ready.catch(() => {})
    const finished = running.finished.catch(() => {})
    await running.updateCallbackDone
    await finished
  } finally {
    if (mine === turn && options.transition) {
      if (before === null) {
        root.removeAttribute(PAGE_TRANSITION_ATTRIBUTE)
      } else {
        root.setAttribute(PAGE_TRANSITION_ATTRIBUTE, before)
      }
    }
  }
}
