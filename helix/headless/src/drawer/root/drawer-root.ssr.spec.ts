import { describe, expect, test } from 'bun:test'
import { hostAttributes, hostTag, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
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
    expect(hostTag(markup, 'helix-headless-drawer')).not.toContain('open')
  })

  test('a drawer opened by default serves the same host as a shut one', () => {
    /* Which is the point rather than a gap. The open state is
       `ElementInternals.states`, so the host carries `default-open` and `label`
       because they were typed, and nothing because the element ran. The dialog
       is shut either way, a server having no `showModal()` to call. */
    const markup = ssr(
      html`<helix-headless-drawer default-open label="Examples">Content</helix-headless-drawer>`,
    )
    expect(hostAttributes(markup, 'helix-headless-drawer')).toEqual(['default-open', 'label'])
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

  test('the content region is served inside the panel, even while closed', () => {
    /* `toContain('Content')` was the host's own text, which declarative shadow
       DOM serializes whatever the drawer renders, so it held for a drawer with
       an empty shadow root. The region and its slot are the claim, and that they
       are inside the `<dialog>`: outside it the content is on screen when the
       drawer is shut. */
    const markup = ssr(html`<helix-headless-drawer label="Examples"></helix-headless-drawer>`)
    expect(rendered(markup, 'helix-headless-drawer')).toMatch(
      /<dialog[\s\S]*<div part="content"><slot><\/slot><\/div>[\s\S]*<\/dialog>/,
    )
  })

  test('renders without reaching for a document it does not have', () => {
    // The controllers attach on open, which the server never reaches.
    expect(() => ssr(html`<helix-headless-drawer>x</helix-headless-drawer>`)).not.toThrow()
  })
})
