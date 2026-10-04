/**
 * Where a rendered element is told to whoever is counting usage.
 *
 * **One slot on `globalThis`, under a registered symbol, and empty by default.**
 * `@fusion.dev/helix-diagnostics` fills it from `watch()` and counts what
 * renders: the tags, the axes set on them, and the named slots filled. With
 * nothing in the slot, which is every page that has not asked, an element pays
 * one property read and a type check once, after its first render.
 *
 * **A registered symbol and not an export**, for two reasons. Diagnostics does
 * not depend on the library it diagnoses, so it cannot import a setter from
 * here, and a page holding two copies of Helix runs two copies of this module:
 * `Symbol.for` is the one key both copies and the collector agree on, so every
 * copy's elements are counted.
 *
 * **Counting only, never sending.** This module holds no network code and
 * never will; what the listener does with an element is the listener's.
 */

/** The key the listener is kept under. `@fusion.dev/helix-diagnostics` names the same string. */
export const USAGE_SLOT = Symbol.for('fusion.dev/helix/usage')

/**
 * Tells the listener, where there is one, that `element` has rendered for the
 * first time.
 *
 * **A listener that throws never breaks the element.** The error is thrown
 * again on a later microtask, so it reaches the console and the page's error
 * handlers, and the render that called this finishes as if nothing listened.
 */
export const reportUsage = (element: HTMLElement): void => {
  const listener = (globalThis as Record<symbol, unknown>)[USAGE_SLOT]
  if (typeof listener !== 'function') {
    return
  }
  try {
    listener(element)
  } catch (error) {
    queueMicrotask(() => {
      throw error
    })
  }
}
