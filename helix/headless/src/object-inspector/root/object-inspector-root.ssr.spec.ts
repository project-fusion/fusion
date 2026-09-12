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

  test('writes nothing onto the host that the consumer did not', () => {
    const markup = ssr(html`<helix-headless-object-inspector></helix-headless-object-inspector>`)
    expect(hostAttributes(markup, 'helix-headless-object-inspector')).toEqual([])
  })
})
