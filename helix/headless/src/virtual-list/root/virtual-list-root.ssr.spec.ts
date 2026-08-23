import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('virtual list server output', () => {
  test('ships the box and its name, which is what a server can know', () => {
    const markup = ssr(
      html`<helix-base-virtual-list for="rows" label="Rows"
        ><template><div data-field="name"></div></template></helix-base-virtual-list
      >`,
    )
    expect(hasPart(markup, 'viewport')).toBe(true)
    expect(hasPart(markup, 'before')).toBe(true)
    expect(hasPart(markup, 'after')).toBe(true)
  })

  test('draws no rows, because the source is named by id and there is no tree', () => {
    /* `getElementById` is undefined in the element shim, so reading the source
       is a client-side enhancement per the server rules, and the honest server
       output is an empty window rather than a guess at one.

       Asked of the host's attributes rather than of the whole document, for the
       reason `scroll-area` records: the stylesheet ships inside the output and
       names its own parts, so a substring check passes on a selector. */
    const markup = ssr(
      html`<helix-base-virtual-list for="rows" label="Rows"
        ><template><div data-field="name"></div></template></helix-base-virtual-list
      >`,
    )
    expect(markup).not.toContain('aria-posinset')
    expect(hostAttributes(markup, 'helix-base-virtual-list')).not.toContain('data-rows')
  })
})
