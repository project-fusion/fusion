import { describe, expect, test } from 'bun:test'
import { hostTag, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('drawer server output', () => {
  test('renders a shut dialog, which is what a fresh load shows', () => {
    /* No `inert` any more: the panel is a real `<dialog>`, and a shut one is
       already out of the tab order and the accessibility tree. The server
       cannot call `showModal()`, so what ships is the element without `open`,
       and the client opens it on the first update. */
    const markup = ssr(
      html`<helix-headless-drawer label="Examples">Content</helix-headless-drawer>`,
    )
    expect(partTag(markup, 'panel')).toMatch(/<dialog/)
    expect(partTag(markup, 'panel')).not.toContain('inert')
    expect(hostTag(markup, 'helix-headless-drawer')).not.toContain('data-open')
  })

  test('renders its real state when opened by default', () => {
    // Server-rendered open, so a drawer that starts open does not settle
    // into place after hydration.
    const markup = ssr(
      html`<helix-headless-drawer default-open label="Examples">Content</helix-headless-drawer>`,
    )
    expect(hostTag(markup, 'helix-headless-drawer')).toContain('data-open')
  })

  test('the name ships with it, and the role is the element', () => {
    /* No `role="dialog"` written by hand: a `<dialog>` has it. The name still
       has to be stated, because a dialog has no accessible name of its own. */
    const markup = ssr(
      html`<helix-headless-drawer label="Examples">Content</helix-headless-drawer>`,
    )
    expect(partTag(markup, 'panel')).toMatch(/<dialog/)
    expect(partTag(markup, 'panel')).not.toContain('role=')
    expect(partTag(markup, 'panel')).toContain('aria-label="Examples"')
  })

  test('content is in the markup even while closed', () => {
    const markup = ssr(
      html`<helix-headless-drawer label="Examples">Content</helix-headless-drawer>`,
    )
    expect(withoutStyles(markup)).toContain('Content')
  })

  test('renders without reaching for a document it does not have', () => {
    // The controllers attach on open, which the server never reaches.
    expect(() => ssr(html`<helix-headless-drawer>x</helix-headless-drawer>`)).not.toThrow()
  })
})
