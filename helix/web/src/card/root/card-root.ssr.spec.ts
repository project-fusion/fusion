import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('card server output', () => {
  const markup = ssr(html`
    <helix-card aria-labelledby="t">
      <h2 id="t" slot="header">Report</h2>
      Body
    </helix-card>
  `)

  test('renders without touching a DOM it does not have', () => {
    expect(markup).toContain('<helix-card')
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(markup).toContain('--helix-color-surface')
  })

  test('every region is present in the shadow root', () => {
    // The host is the surface, so there is no container part to find: the
    // shadow root is slots and nothing else.
    expect(hostAttributes(markup, 'helix-card')).toEqual(['aria-labelledby'])
    const structure = withoutStyles(markup)
    for (const name of ['media', 'header', 'footer']) {
      expect(structure, name).toContain(`<slot name="${name}">`)
    }
  })

  test('the horizontal layout is a template swap, not different markup', () => {
    // Both orientations render the same regions, so orientation can change at
    // runtime without re-rendering, and the server output is layout-agnostic.
    const horizontal = ssr(html`
      <helix-card orientation="horizontal">
        <img slot="media" src="/cover.avif" alt="" />
        Body
      </helix-card>
    `)
    const structure = withoutStyles(horizontal)
    for (const name of ['media', 'header', 'footer']) {
      expect(structure, name).toContain(`<slot name="${name}">`)
    }
    /* The host, not the string. `toMatch(/orientation="horizontal"/)` against
       the whole document passed on `:host([orientation="horizontal"])` in the
       card's own inlined stylesheet, which is there whatever the card was
       given: the assertion could not have failed. */
    expect(hostAttributes(horizontal, 'helix-card')).toContain('orientation')
  })

  test('slotted content reaches the markup', () => {
    // Light DOM is in the response, so a crawler reads the card without JS.
    expect(markup).toContain('Report')
    expect(markup).toContain('slot="header"')
  })

  test('an omitted region needs no rule to hide it', () => {
    // There is no wrapper to hide. An unassigned `<slot>` is `display: contents`
    // and generates no box, which is what makes this correct on the server,
    // where the component cannot inspect its own children.
    expect(markup).not.toContain(':has(')
    expect(markup).toContain('<slot name="footer">')
  })
})
