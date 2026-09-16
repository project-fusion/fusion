import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  rendered,
  servedParts,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('card server output', () => {
  const served = ssr(html`
    <helix-card aria-labelledby="t">
      <h2 id="t" slot="header">Report</h2>
      Body
    </helix-card>
  `)
  const markup = withoutStyles(served)

  test('renders without touching a DOM it does not have', () => {
    /* `toContain('<helix-card')` was the consumer's own opening tag echoed
       back, so it passed whether the card rendered its shadow root or nothing
       at all. The unnamed slot is the smallest thing that is only there if it
       rendered. */
    expect(rendered(markup, 'helix-card')).toContain('<slot></slot>')
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(rendered(markup, 'helix-card')).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--helix-color-surface')
  })

  test('every region is present in the shadow root', () => {
    // The host is the surface, so there is no container part to find: the
    // shadow root is slots and nothing else.
    expect(hostAttributes(markup, 'helix-card')).toEqual(['aria-labelledby'])
    const structure = rendered(markup, 'helix-card')
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
    const structure = rendered(horizontal, 'helix-card')
    for (const name of ['media', 'header', 'footer']) {
      expect(structure, name).toContain(`<slot name="${name}">`)
    }
    /* The host, not the string. `toMatch(/orientation="horizontal"/)` against
       the whole document passed on `:host([orientation="horizontal"])` in the
       card's own inlined stylesheet, which is there whatever the card was
       given: the assertion could not have failed. */
    expect(hostAttributes(horizontal, 'helix-card')).toContain('orientation')
  })

  test('every child is projected, with nothing of the card between it and the page', () => {
    /* `toContain('Report')` and `toContain('slot="header"')` both passed on the
       spec's own `<h2>`, which is in the response whatever the card renders:
       measured with the shadow root emptied, both held. The served frame is the
       claim a crawler cares about. Four slots and no part means every child
       lands somewhere and nothing of the card's own wraps it or reorders it. */
    expect(rendered(markup, 'helix-card').match(/<slot\b/g)).toHaveLength(4)
    expect(servedParts(markup)).toEqual([])
  })

  test('an omitted region needs no rule to hide it', () => {
    // There is no wrapper to hide. An unassigned `<slot>` is `display: contents`
    // and generates no box, which is what makes this correct on the server,
    // where the component cannot inspect its own children.
    expect(markup).not.toContain(':has(')
    expect(rendered(markup, 'helix-card')).toContain('<slot name="footer">')
  })
})
