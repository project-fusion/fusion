'use client'

import { useEffect } from 'react'

/**
 * Registers the sandbox editor, after React has hydrated.
 *
 * **The editor is not in the site's own registrar and cannot be.**
 * `HelixElements` imports `@fusion.dev/helix` and `@fusion.dev/helix-sandbox`, and the
 * sandbox barrel exports the JSX helpers and the spec runner and not this: the
 * editor carries CodeMirror, so registering it from the root layout would put
 * it on every page of the site to serve two. So the two routes that render one
 * ask for it themselves.
 *
 * **Deferring the import is a code-splitting decision, not a hydration fix.**
 * CodeMirror is about four megabytes and this keeps it out of the bundle a
 * reader pays for before they have opened an editor. Hydration is safe either
 * way, `HelixElement` recording its marks as `ElementInternals.states` entries
 * rather than in the DOM.
 *
 * The window where the tag is unknown is what `@fusion.dev/helix/elements.css`
 * already covers, hiding `:not(:defined)` by visibility so nothing reflows when
 * the definition lands.
 */
export function useSandboxEditor(): void {
  useEffect(() => {
    void import('@fusion.dev/helix-sandbox/editor')
  }, [])
}
