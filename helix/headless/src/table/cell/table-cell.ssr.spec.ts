import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
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

   `data-` names were the exception and are nearly none of them now. A boolean
   state that is true only because a reader acted still mirrors to one, since
   the write falls long after hydration and a pasted `data-closed` is inert:
   `Toast.Item` is the case, and a first version of this asserted no attributes
   at all and reported it for doing exactly the sanctioned thing. A state that
   can be true on the first update mirrors to nothing at all. `checked`, `open`,
   `invalid` and `has-label` moved to `ElementInternals.states` on 27 Aug 2026,
   which is not in the DOM, so the server's output and the client's cannot
   disagree about them and there is nothing here to assert.

   What it deliberately does not assert is the part's own markup. That is the
   component's business and belongs in a spec written about it, not in one
   generated across twenty-five of them: an assertion nobody chose is an
   assertion nobody maintains. */
describe('table cell server output', () => {
  test('renders on a server, where there is no DOM to reach for', () => {
    expect(
      withoutStyles(ssr(html`<helix-headless-table-cell></helix-headless-table-cell>`)),
    ).toContain('helix-headless-table-cell')
  })

  test('the host declares nothing of its own beyond a `data-` mirror', () => {
    const written = hostAttributes(
      ssr(html`<helix-headless-table-cell></helix-headless-table-cell>`),
      'helix-headless-table-cell',
    )
    expect(written.filter((one) => !one.startsWith('data-'))).toEqual([])
  })
})
