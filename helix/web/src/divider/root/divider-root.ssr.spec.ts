import { describe, expect, test } from 'bun:test'
import { html } from 'lit'
import { ssr } from '../../testing/ssr.js'
import '../index.js'

describe('divider server output', () => {
  test('the separator role is in the markup, not applied on connect', () => {
    // The role is rendered rather than written onto the host in a lifecycle
    // hook, because the server never runs `connectedCallback`.
    const markup = ssr(html`<helix-divider></helix-divider>`)
    expect(markup).toContain('role="separator"')
    expect(markup).toContain('aria-orientation="horizontal"')
  })

  test('orientation is decided on the server', () => {
    const markup = ssr(html`<helix-divider orientation="vertical"></helix-divider>`)
    expect(markup).toContain('aria-orientation="vertical"')
  })
})
