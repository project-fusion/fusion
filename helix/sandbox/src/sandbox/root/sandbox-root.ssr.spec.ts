import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../../index.js'

const markup = ssr(html`<helix-sandbox>
  <helix-sandbox-source slot="source" value="<p>one</p>"></helix-sandbox-source>
  <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
</helix-sandbox>`)

describe('sandbox server output', () => {
  test('renders without reading children it cannot see', () => {
    // The coordination listener is attached on connect, which the server never
    // calls, so rendering at all proves nothing walks the tree.
    expect(hasPart(markup, 'container')).toBe(true)
    expect(hasPart(markup, 'separator')).toBe(true)
  })

  test('the divider ships with its full state, not just a role', () => {
    const separator = partTag(markup, 'separator')
    expect(separator).toContain('role="separator"')
    expect(separator).toContain('aria-valuenow="45"')
    expect(separator).toContain('aria-valuemin="15"')
    expect(separator).toContain('tabindex="0"')
  })

  test('the source pane is a labelled textarea in the served markup', () => {
    expect(partTag(markup, 'source')).toContain('aria-label="Example source"')
    expect(withoutStyles(markup)).toContain('<textarea')
  })

  test('the split is applied as a style, so no layout shift on hydration', () => {
    expect(partTag(markup, 'container')).toContain('45%')
  })
})
