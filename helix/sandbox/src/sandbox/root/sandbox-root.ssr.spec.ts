import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../../index.js'

const markup = ssr(html`<helix-sandbox>
  <helix-sandbox-source slot="source" value="<p>one</p>"></helix-sandbox-source>
  <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
</helix-sandbox>`)

/**
 * The divider inside a named splitter, rather than the first one in the file.
 *
 * There are two now, nested, and the outer one comes first: a spec reaching for
 * "the separator" got the panel's and read its bounds as the panes'.
 *
 * `withoutStyles` first, and that is not tidiness. Declarative shadow DOM inlines
 * each component's stylesheet into the very markup being searched, and this one
 * names `[part="panes"]` in a selector: the search found the CSS, started from
 * there, and the next divider after it was the panel's again.
 */
const bare = withoutStyles(markup)

const dividerIn = (part: string): string => {
  const at = bare.indexOf(`part="${part}"`)
  expect(at).toBeGreaterThan(-1)
  const divider = /<div\s+part="separator"[^>]*>/.exec(bare.slice(at))
  return divider?.[0] ?? ''
}

describe('sandbox server output', () => {
  test('renders without reading children it cannot see', () => {
    // The coordination listener is attached on connect, which the server never
    // calls, so rendering at all proves nothing walks the tree.
    expect(hasPart(markup, 'pane')).toBe(true)
    expect(hasPart(markup, 'body')).toBe(true)
    expect(hasPart(markup, 'panes')).toBe(true)
  })

  test('the panes divider ships with its full state, not just a role', () => {
    const separator = dividerIn('panes')
    expect(separator).toContain('role="separator"')
    // A position, whatever the default is. Pinning the number made a change of
    // default read as a divider that had stopped reporting itself.
    expect(separator).toMatch(/aria-valuenow="\d+"/)
    // 0, not a floor a drag stops at: past that a pane closes, so nothing is a
    // position a reader can reach and the range has to say so.
    expect(separator).toContain('aria-valuemin="0"')
    expect(separator).toContain('aria-valuemax="100"')
    expect(separator).toContain('tabindex="0"')
  })

  test('the panel divider is served on the floor, with no panel to size', () => {
    // `hasPanel` is a question about the tree, which a server cannot ask, so the
    // panel starts shut and the divider starts flush against the bottom. The
    // stylesheet takes it away entirely once the client says there is one.
    const separator = dividerIn('body')
    expect(separator).toContain('aria-valuenow="100"')
    expect(separator).toContain('data-flush')
  })

  test('no corner is served, because a crossing is a fact about the tree', () => {
    expect(hasPart(markup, 'panes')).toBe(true)
    expect(hasPart(markup, 'corner')).toBe(false)
  })

  test('the source pane is a labelled textarea in the served markup', () => {
    expect(partTag(markup, 'source')).toContain('aria-label="Example source"')
    expect(withoutStyles(markup)).toContain('<textarea')
  })

  test('the host carries only what the consumer wrote', () => {
    // `data-panel` is mirrored once the element upgrades, never served.
    expect(hostAttributes(markup, 'helix-sandbox')).toEqual([])
  })
})
