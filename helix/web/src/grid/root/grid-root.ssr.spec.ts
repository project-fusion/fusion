import { describe, expect, test } from 'bun:test'
import { ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('grid server output', () => {
  // The regression this exists for: the track list used to be rendered into a
  // `<style>` element, and Lit rejects expressions inside one. It threw during
  // server rendering, and nothing caught it because layout had no SSR spec.
  test('renders without throwing', () => {
    expect(() => ssr(html`<helix-grid min="18rem">x</helix-grid>`)).not.toThrow()
    expect(() => ssr(html`<helix-grid columns={3}>x</helix-grid>`)).not.toThrow()
  })

  test('a fixed column count is plain CSS, so it holds before upgrade', () => {
    const markup = ssr(html`<helix-grid columns="3">x</helix-grid>`)
    expect(markup).toContain(':host([columns="3"])')
  })

  test('content reaches the markup', () => {
    expect(withoutStyles(ssr(html`<helix-grid>item</helix-grid>`))).toContain('item')
  })
})
