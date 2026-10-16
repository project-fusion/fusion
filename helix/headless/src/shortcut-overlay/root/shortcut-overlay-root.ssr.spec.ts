import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('shortcut overlay server output', () => {
  const served = ssr(html`<helix-headless-shortcut-overlay></helix-headless-shortcut-overlay>`)

  test('serves a closed sheet and no badges', () => {
    const markup = rendered(withoutStyles(served), 'helix-headless-shortcut-overlay')
    expect(markup).toMatch(/<helix-headless-dialog\s/)
    expect(markup).not.toMatch(/part="badges"/)
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(hostAttributes(served, 'helix-headless-shortcut-overlay')).toEqual([])
  })
})
