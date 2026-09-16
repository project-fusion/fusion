import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* The two questions a server spec answers for any part.

   **That it renders at all**, which is what fails when a component reaches for
   the DOM to draw itself: `querySelector` is undefined on the server and any
   parent-to-child coordination throws, so a part that works in a browser can
   still take the whole page down before it reaches one. Asked of what came out
   of the render, because the tag name is no answer: it is the host's own opening
   tag, which is the consumer's markup echoed back, so `toContain` on it passed
   against a shadow root holding nothing whatever. The parts it drew, or, for the
   five that pass their children straight through and carry no part at all, the
   slot that does the passing.

   **That the host carries no attribute of its own beyond a `data-` mirror.** An
   element writing its own bookkeeping onto itself is markup the server never
   sent, which React reports as a hydration mismatch and a copy-paste re-parses
   as a declaration.

   The `data-` exception is narrow. A boolean state that is true only because a
   reader acted still mirrors to one, since the write falls long after hydration
   and a pasted `data-closed` is inert: `Toast.Item` is the case. A state that
   can be true on the first update mirrors to nothing at all, and `checked`,
   `open`, `invalid` and `has-label` live in `ElementInternals.states`, which is
   not in the DOM, so the server's output and the client's cannot disagree about
   them and there is nothing here to assert.

   It deliberately does not assert the part's own markup. That is the
   component's business and belongs in a spec written about it, not in one
   generated across every part: an assertion nobody chose is an assertion nobody
   maintains. */
describe('table row server output', () => {
  test('renders on a server, where there is no DOM to reach for', () => {
    expect(
      rendered(
        ssr(html`<helix-headless-table-row></helix-headless-table-row>`),
        'helix-headless-table-row',
      ),
    ).toContain('<slot')
  })

  test('the host declares nothing of its own beyond a `data-` mirror', () => {
    const written = hostAttributes(
      ssr(html`<helix-headless-table-row></helix-headless-table-row>`),
      'helix-headless-table-row',
    )
    expect(written.filter((one) => !one.startsWith('data-'))).toEqual([])
  })
})
