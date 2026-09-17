import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
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
describe('tree item server output', () => {
  test('renders on a server, where there is no DOM to reach for', () => {
    expect(
      servedParts(ssr(html`<helix-headless-tree-item></helix-headless-tree-item>`)),
    ).not.toEqual([])
  })

  test('the host declares nothing of its own beyond a `data-` mirror', () => {
    const written = hostAttributes(
      ssr(html`<helix-headless-tree-item></helix-headless-tree-item>`),
      'helix-headless-tree-item',
    )
    expect(written.filter((one) => !one.startsWith('data-'))).toEqual([])
  })

  /**
   * **A server's tree is reachable**, for the reason `Radio.Root`'s own server
   * spec writes out: `focusable` is the tree's word, the tree says it by
   * reading its rows, and a server has none to read. A `-1` on every row is a
   * claim about a stop that does not exist yet, and it left the whole tree out
   * of the tab order.
   */
  test('a row nothing has answered for is in the tab order rather than out of it', () => {
    expect(
      partTag(ssr(html`<helix-headless-tree-item></helix-headless-tree-item>`), 'item'),
    ).toContain('tabindex="0"')
  })

  test('a selected row says so in the served markup, and an unselected one says it too', () => {
    /* `aria-selected` is written on every row rather than only the chosen one,
       which is what a `treeitem` in a single-select tree owes: a row with no
       attribute reads as "not selectable" rather than "not selected", so the
       reader is told the tree cannot be chosen from.

       Served rather than written on upgrade, because the attribute is the
       reader's only way to know before the script lands, and because writing it
       later onto markup React rendered is the mismatch the mirror rules exist
       to prevent. `selected` mirrors to a custom state for the stylesheet and
       never to an attribute on the host, which the host assertion below holds. */
    expect(
      partTag(
        ssr(html`<helix-headless-tree-item selected>Docs</helix-headless-tree-item>`),
        'item',
      ),
    ).toContain('aria-selected="true"')
    expect(
      partTag(ssr(html`<helix-headless-tree-item>Docs</helix-headless-tree-item>`), 'item'),
    ).toContain('aria-selected="false"')
  })

  test('a selected row that is a link carries the state on the link itself', () => {
    /* The anchor is the `treeitem` when there is one, the box around it taking
       `role="none"`, so the state has to move with the role or it lands on an
       element the accessibility tree has been told to ignore. */
    const linked = ssr(
      html`<helix-headless-tree-item href="/docs" selected>Docs</helix-headless-tree-item>`,
    )
    expect(partTag(linked, 'row')).toContain('aria-selected="true"')
    expect(partTag(linked, 'item')).toContain('role="none"')
    expect(partTag(linked, 'item')).not.toContain('aria-selected')
  })
})
