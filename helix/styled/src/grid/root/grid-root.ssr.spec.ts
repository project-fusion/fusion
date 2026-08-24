import { describe, expect, test } from 'bun:test'
import { ssr, withoutStyles } from '@helix-io/testing/ssr'
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
    const markup = ssr(html`<helix-grid columns="3">x</helix-grid>`)
    expect(markup).toContain(':host([columns="3"])')
  })

  test('content reaches the markup', () => {
    expect(withoutStyles(ssr(html`<helix-grid>item</helix-grid>`))).toContain('item')
  })
})
