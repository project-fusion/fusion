import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
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
    expect(rendered(markup, 'helix-headless-object-inspector')).toContain('1 key')
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
    /* The frame whole rather than the marks somebody thought to name, and not
       `toContain('{"a":1}')`, which was the spec's own `<script>` sibling: this
       component neither renders it nor can remove it, so that held whatever the
       inspector drew, the empty render included. */
    expect(servedParts(markup)).toEqual([
      'arrow',
      'button',
      'copy',
      'frame',
      'mark',
      'tooltip',
      'tree',
    ])
  })

  test('writes nothing onto the host that the consumer did not', () => {
    const markup = ssr(html`<helix-headless-object-inspector></helix-headless-object-inspector>`)
    expect(hostAttributes(markup, 'helix-headless-object-inspector')).toEqual([])
  })

  test('`no-copy` takes the copy control out of the served frame', () => {
    /* A control removed on the first client update is one a reader can press
       before the update lands, and one whose space the row was laid out around.
       Asserted on the whole served frame rather than on the absence of one
       name: a spec naming the control it thought of goes on passing when the
       branch starts rendering a second one. */
    const bare = servedParts(
      ssr(html`<helix-headless-object-inspector no-copy></helix-headless-object-inspector>`),
    )
    const full = servedParts(
      ssr(html`<helix-headless-object-inspector></helix-headless-object-inspector>`),
    )
    expect(bare).not.toEqual(full)
    expect(full.filter((one) => !bare.includes(one))).toEqual([
      'arrow',
      'button',
      'copy',
      'mark',
      'tooltip',
    ])
  })

  /* A filter written in the markup is the server's to apply: the narrowed
     rows are the first response, and hydration finds the same ones. */
  test('a filter in the markup serves only the matches and the way to them', () => {
    const markup = ssr(
      html`<helix-headless-object-inspector
        filter="main"
        .value=${{ meta: { branch: 'main' }, name: 'dpl' }}
      ></helix-headless-object-inspector>`,
    )
    const shown = rendered(markup, 'helix-headless-object-inspector')
    expect(shown).toMatch(/part="row row-match"/)
    expect(shown).toContain('branch')
    expect(shown).not.toContain('dpl')
  })

  test('`filterable` serves the field, and nothing says a count before a filter', () => {
    const markup = ssr(
      html`<helix-headless-object-inspector filterable></helix-headless-object-inspector>`,
    )
    expect(partTag(markup, 'search-field')).toContain('type="search"')
    expect(servedParts(markup)).not.toContain('live')
  })

  test('every row says it is not selected', () => {
    const markup = ssr(
      html`<helix-headless-object-inspector .value=${{ a: 1 }}></helix-headless-object-inspector>`,
    )
    expect(partTag(markup, 'row')).toContain('aria-selected="false"')
  })
})
