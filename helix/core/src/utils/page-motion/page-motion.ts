/**
 * Whether the page has paused the motion that starts by itself: a
 * carousel's rotation, an autoplaying video, an ambient drawing such as
 * `Aura`, a graph settling or turning, a map's frames. **One switch for the
 * page**, as WCAG 2.2.2 asks of motion that starts by itself and runs longer
 * than five seconds, so a reader who stops it once has stopped all of it.
 *
 * **Kept on the document element**, as `data-helix-motion="paused"`, so a
 * page can write it in its markup or set it from its own code as well as
 * from `Motion Toggle`, and a stylesheet can select on it. Every component
 * that moves by itself reads it, and hears it change.
 *
 * Separate from `prefers-reduced-motion`, which a component reads too: that
 * asks for less movement everywhere and from the start, and this stops
 * motion already running, on this page, when the reader asks.
 */

/** The attribute on the document element that holds the page's choice. */
export const MOTION_ATTRIBUTE = 'data-helix-motion'

/** Whether the page has paused the motion that starts by itself. False on a server, where nothing moves. */
export const motionPaused = (): boolean =>
  typeof document !== 'undefined' &&
  document.documentElement?.getAttribute(MOTION_ATTRIBUTE) === 'paused'

/** Pauses the motion that starts by itself across the page, or with `false` lets it run again. */
export const pauseMotion = (paused = true): void => {
  if (typeof document === 'undefined') {
    return
  }
  if (paused) {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'paused')
  } else {
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE)
  }
}

/** Whether the reader's system asks for movement to be kept to a minimum. */
export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const listeners = new Set<(paused: boolean) => void>()
let watcher: MutationObserver | undefined
let last = false

/**
 * Calls `listener` with the page's choice whenever it changes, however it
 * was changed. Returns what stops listening. **One observer for the page**,
 * shared by every listener, and none at all while nobody listens.
 */
export const onMotionChange = (listener: (paused: boolean) => void): (() => void) => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => undefined
  }
  listeners.add(listener)
  if (!watcher) {
    last = motionPaused()
    watcher = new MutationObserver(() => {
      const now = motionPaused()
      if (now !== last) {
        last = now
        for (const one of [...listeners]) {
          one(now)
        }
      }
    })
    watcher.observe(document.documentElement, {
      attributeFilter: [MOTION_ATTRIBUTE],
      attributes: true,
    })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      watcher?.disconnect()
      watcher = undefined
    }
  }
}
