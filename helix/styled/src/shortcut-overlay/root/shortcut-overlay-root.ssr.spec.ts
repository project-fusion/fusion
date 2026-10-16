import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('shortcut overlay server output', () => {
  const served = ssr(html`<helix-shortcut-overlay></helix-shortcut-overlay>`)

  test('serves the sheet as this tier’s dialog, closed, and no badges', () => {
    const markup = rendered(withoutStyles(served), 'helix-shortcut-overlay')
    expect(markup).toMatch(/<helix-dialog\s/)
    expect(markup).not.toMatch(/part="badges"/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-shortcut-overlay')).toEqual([])
  })
})
