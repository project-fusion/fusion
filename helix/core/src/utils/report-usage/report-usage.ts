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

import { VERSION } from '../../version.js'

/** The key the listener is kept under. `@fusion.dev/helix-diagnostics` names the same string. */
export const USAGE_SLOT = Symbol.for('fusion.dev/helix/usage')

/**
 * The key the loaded versions are listed under: every copy of core on the
 * page adds its own once, so a page holding two copies lists two.
 * `@fusion.dev/helix-diagnostics` compares the list with the version its
 * manifest names.
 *
 * **On `globalThis` and not on the element classes**, where a field would be
 * listed as a member of every component in the manifest and on every
 * reference page.
 */
export const VERSIONS_SLOT = Symbol.for('fusion.dev/helix/versions')

/** Adds this copy's version to the page's list, once. */
export const noteVersion = (): void => {
  const store = globalThis as Record<symbol, unknown>
  const listed = Array.isArray(store[VERSIONS_SLOT]) ? (store[VERSIONS_SLOT] as string[]) : []
  if (!listed.includes(VERSION)) {
    listed.push(VERSION)
  }
  store[VERSIONS_SLOT] = listed
}

/** Whether a listener's failure has been printed, so a failing listener prints once. */
let told = false

/**
 * Tells the listener, where there is one, that `element` has rendered for the
 * first time.
 *
 * **A listener that throws never breaks the element, nor the page.** The
 * error is printed once, and the render that called this finishes as if
 * nothing listened. It used to be thrown again on a later microtask, which
 * reached `window.onerror`, a team's error tracker, and Cypress, which fails a
 * test on any uncaught error: a diagnostics listener is the last thing that
 * should fail somebody's tests.
 */
export const reportUsage = (element: HTMLElement): void => {
  const listener = (globalThis as Record<symbol, unknown>)[USAGE_SLOT]
  if (typeof listener !== 'function') {
    return
  }
  try {
    listener(element)
  } catch (error) {
    if (!told) {
      told = true
      console.error(
        'helix: a usage listener threw, and the element rendered as usual. Later failures are not printed.',
        error,
      )
    }
  }
}
