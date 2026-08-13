'use client'

import '@helix-io/web'
import '@helix-io/sandbox'

/**
 * Registers every element the site can render.
 *
 * The barrels rather than subpaths: this site shows the whole library, so there
 * is nothing to tree-shake and one import cannot drift as components are added.
 * A client component because a custom element registers as a side effect of
 * importing it, and a server component's imports never reach the browser.
 *
 * Renders nothing. It exists for its imports.
 */
export function HelixElements(): null {
  return null
}
