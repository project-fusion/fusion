import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

/* The two questions a server spec can answer for any part, and the two that
   have each caught a real fault here.

   **That it renders at all**, which is what fails when a component reaches for
   the DOM to draw itself: `querySelector` is undefined on the server and any
   parent-to-child coordination throws, so a part that works in a browser can
   still take the whole page down before it reaches one.

   **That the host carries no attribute of its own beyond a `data-` mirror.** An
   element writing its own bookkeeping onto itself is markup the server never
   sent, which React reports as a hydration mismatch and a copy-paste re-parses
   as a declaration. `Tree.chevronPlacement`, `Toast.placement` and
   `Image.status` were each caught that way.

   `data-` names are the exception and the library's own answer: a boolean state
   mirrors to one deliberately, the server and the client agree on it, and a
   pasted `data-open` is inert because nothing reads it as a declaration. A
   first version of this asserted no attributes at all and reported
   `Toast.Item`, which was doing exactly the sanctioned thing.

   What it deliberately does not assert is the part's own markup. That is the
   component's business and belongs in a spec written about it, not in one
   generated across twenty-five of them: an assertion nobody chose is an
   assertion nobody maintains. */
describe('speed dial item server output', () => {
  test('renders on a server, where there is no DOM to reach for', () => {
    expect(
      withoutStyles(ssr(html`<helix-base-speed-dial-item></helix-base-speed-dial-item>`)),
    ).toContain('helix-base-speed-dial-item')
  })

  test('the host declares nothing of its own beyond a `data-` mirror', () => {
    const written = hostAttributes(
      ssr(html`<helix-base-speed-dial-item></helix-base-speed-dial-item>`),
      'helix-base-speed-dial-item',
    )
    expect(written.filter((one) => !one.startsWith('data-'))).toEqual([])
  })
})
