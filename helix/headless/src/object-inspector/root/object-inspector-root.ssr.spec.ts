import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * An inspector, served.
 *
 * A value bound as a property is the server's to draw, so the rows are in the
 * first response. One named by `for` is read from the document, which a server
 * does not have, so it arrives with script; that is the trade `VirtualList`
 * already makes for the same channel.
 */
describe('object inspector server output', () => {
  test('a bound value is drawn as a tree, its rows in the markup', () => {
    const markup = ssr(
      html`<helix-headless-object-inspector .value=${{ a: 1 }}></helix-headless-object-inspector>`,
    )
    expect(partTag(markup, 'tree')).toContain('role="tree"')
    expect(partTag(markup, 'row')).toContain('role="treeitem"')
    expect(withoutStyles(markup)).toContain('1 key')
  })

  /**
   * The other channel, and the one the class doc leads with.
   *
   * A `for` names an id and resolving an id wants a document, so the server has
   * no value to draw. What it serves is the frame: the tree's box, so the sheet's
   * own height applies and the space the rows will fill is reserved before they
   * exist, and the script the value is in, which is ordinary markup served whole.
   */
  test('a value named by `for` is not drawn, and the box that will hold it is', () => {
    const markup = ssr(
      html`<div>
        <script type="application/json" id="payload">{"a":1}</script>
        <helix-headless-object-inspector for="payload"></helix-headless-object-inspector>
      </div>`,
    )
    expect(partTag(markup, 'tree')).toContain('role="tree"')
    expect(partTag(markup, 'tree')).not.toContain('role="treeitem"')
    expect(withoutStyles(markup)).toContain('{"a":1}')
  })

  test('writes nothing onto the host that the consumer did not', () => {
    const markup = ssr(html`<helix-headless-object-inspector></helix-headless-object-inspector>`)
    expect(hostAttributes(markup, 'helix-headless-object-inspector')).toEqual([])
  })
})
