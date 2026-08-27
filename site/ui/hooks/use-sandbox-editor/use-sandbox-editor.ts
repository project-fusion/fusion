'use client'

import { useEffect } from 'react'

/**
 * Registers the sandbox editor, after React has hydrated.
 *
 * **The editor is not in the site's own registrar and cannot be.**
 * `HelixElements` imports `@helix-io/styled` and `@helix-io/sandbox`, and the
 * sandbox barrel exports the JSX helpers and the spec runner and not this: the
 * editor carries CodeMirror, so registering it from the root layout would put
 * it on every page of the site to serve two. So the two routes that render one
 * ask for it themselves, and that is correct.
 *
 * **What was wrong was the shape of the asking.** Both wrote
 * `import '@helix-io/sandbox/editor'` at module scope, which registers the
 * definitions during the client bundle's evaluation rather than after
 * hydration, and that is the failure `helix-elements.tsx` was written to
 * prevent: the elements upgrade first, write their own bookkeeping onto
 * themselves, and React then walks a DOM that has gained attributes since the
 * server wrote it.
 *
 * Measured across three routes rather than argued: `/helix`, which registers
 * only through the deferred effect, produces no hydration diff, while
 * `/helix/theme` produces one and `/helix/sandbox` three, every one of them a
 * `data-settled=""` the server never sent. It was written from a
 * `requestAnimationFrame` in `firstUpdated`, so a definition that landed during
 * module evaluation had a frame to spend before React arrived and one that
 * landed in an effect did not.
 *
 * **It reports nothing on the surface that would send anyone looking**, which
 * is why it survived: the page renders, the editor works, and the only sign is
 * a console message naming an attribute no author wrote.
 *
 * **The attribute is gone and so is that failure.** `HelixElement` records the
 * mark as an `ElementInternals.states` entry now, which is deliberately not in
 * the DOM, so an element that upgrades before React arrives writes nothing
 * React can find missing. The three routes measured above cannot diverge on it
 * any more, whichever side of hydration a definition lands.
 *
 * The deferred import stays, for the reason it would have been worth writing
 * without the bug: CodeMirror is about four megabytes and this keeps it out of
 * the bundle a reader pays for before they have opened an editor. What changed
 * is that it is a code-splitting decision rather than a hydration fix.
 *
 * The window where the tag is unknown is what `@helix-io/styled/elements.css`
 * already covers, hiding `:not(:defined)` by visibility so nothing reflows when
 * the definition lands.
 */
export function useSandboxEditor(): void {
  useEffect(() => {
    void import('@helix-io/sandbox/editor')
  }, [])
}
