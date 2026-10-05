import { describe, expect, test } from 'bun:test'
import { rendered, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('grid server output', () => {
  // Lit rejects an expression inside a `<style>` element, and the throw comes
  // at server render time only, so a track list built that way needs this.
  test('renders without throwing', () => {
    expect(() => ssr(html`<helix-grid min="18rem">x</helix-grid>`)).not.toThrow()
    expect(() => ssr(html`<helix-grid columns={3}>x</helix-grid>`)).not.toThrow()
  })

  test('a fixed column count is plain CSS, so it holds before upgrade', () => {
    const served = ssr(html`<helix-grid columns="3">x</helix-grid>`)
    expect(styles(served)).toContain(':host([columns="3"])')
  })

  /* A rule filled in after upgrade left a server-rendered `min` grid in one
     column until then, and it reflowed as it upgraded. */
  test('a minimum is in the server output, so the grid reflows before upgrade', () => {
    const served = rendered(ssr(html`<helix-grid min="12rem">x</helix-grid>`), 'helix-grid')
    expect(served).toContain('minmax(min(12rem, 100%), 1fr)')
  })

  test('so is a count the stylesheet does not list', () => {
    const served = rendered(ssr(html`<helix-grid columns="12">x</helix-grid>`), 'helix-grid')
    expect(served).toContain('repeat(12, minmax(0, 1fr))')
  })

  test('the content is projected, not built on the client', () => {
    /* `toContain('item')` passed on the host's own text, which is in the
       response whatever the grid renders. The unnamed slot is the claim. */
    expect(rendered(ssr(html`<helix-grid>item</helix-grid>`), 'helix-grid')).toContain(
      '<slot></slot>',
    )
  })
})
