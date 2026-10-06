import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('virtual list server output', () => {
  test('ships the box and its name, which is what a server can know', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-virtual-list for="rows" label="Rows"
        ><template><div data-field="name"></div></template></helix-headless-virtual-list
      >`,
      ),
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
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-virtual-list for="rows" label="Rows"
        ><template><div data-field="name"></div></template></helix-headless-virtual-list
      >`,
      ),
    )
    expect(markup).not.toContain('aria-posinset')
    expect(hostAttributes(markup, 'helix-headless-virtual-list')).not.toContain('data-rows')
  })

  test('serves the empty frame for items given as a property, which it draws once upgraded', () => {
    /* Rows are light DOM the list writes on the client, so a server has none
       to send whatever `items` holds, and the frame it sends is the one a
       hydrating client draws first. */
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-virtual-list
          label="Rows"
          .items=${[{ name: 'a' }, { name: 'b' }]}
          .renderItem=${(item: { name: string }) => item.name}
        ></helix-headless-virtual-list>`,
      ),
    )
    expect(hasPart(markup, 'viewport')).toBe(true)
    expect(markup).not.toContain('aria-posinset')
    expect(markup).not.toContain('tabindex')
  })

  test('serves the grid a list with columns lays its items in, and none for a list', () => {
    const tag = 'helix-headless-virtual-list'
    const grid = rendered(
      ssr(
        html`<helix-headless-virtual-list columns="3" label="Photos"></helix-headless-virtual-list>`,
      ),
      tag,
    )
    expect(grid).toContain('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))')
    const plain = rendered(
      ssr(html`<helix-headless-virtual-list label="Rows"></helix-headless-virtual-list>`),
      tag,
    )
    expect(plain).not.toContain('grid-template-columns')
  })
})
