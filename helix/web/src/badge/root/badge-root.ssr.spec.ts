import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('badge server output', () => {
  test('the capped count is decided on the server', () => {
    const markup = withoutStyles(ssr(html`<helix-badge max="9" value="42">x</helix-badge>`))
    expect(markup).toContain('9+')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-badge dot label="new">x</helix-badge>`)
    expect(hostAttributes(markup, 'helix-badge')).toEqual(['dot', 'label'])
  })
})
