import { describe, expect, test } from 'bun:test'
import { hostTag, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('drawer server output', () => {
  test('renders closed and inert, which is what a fresh load shows', () => {
    const markup = ssr(html`<helix-drawer label="Examples">Content</helix-drawer>`)
    expect(partTag(markup, 'panel')).toContain('inert')
    expect(hostTag(markup, 'helix-drawer')).not.toContain('data-open')
  })

  test('renders its real state when opened by default', () => {
    // Server-rendered open, so a drawer that starts open does not settle
    // into place after hydration.
    const markup = ssr(html`<helix-drawer default-open label="Examples">Content</helix-drawer>`)
    expect(hostTag(markup, 'helix-drawer')).toContain('data-open')
    expect(partTag(markup, 'panel')).not.toContain('inert')
  })

  test('the dialog role and name ship with it', () => {
    const markup = ssr(html`<helix-drawer label="Examples">Content</helix-drawer>`)
    expect(partTag(markup, 'panel')).toContain('role="dialog"')
    expect(partTag(markup, 'panel')).toContain('aria-label="Examples"')
  })

  test('content is in the markup even while closed', () => {
    const markup = ssr(html`<helix-drawer label="Examples">Content</helix-drawer>`)
    expect(withoutStyles(markup)).toContain('Content')
  })

  test('renders without reaching for a document it does not have', () => {
    // The controllers attach on open, which the server never reaches.
    expect(() => ssr(html`<helix-drawer>x</helix-drawer>`)).not.toThrow()
  })
})
