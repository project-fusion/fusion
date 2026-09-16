import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('dialog server output', () => {
  test('the dialog ships closed, with its content inside it', () => {
    /* Present and shut, so the content is in the served HTML for anything
       reading the page. `showModal()` is a client-side act and there is no
       server equivalent: a dialog cannot be open in markup. */
    const markup = ssr(
      html`<helix-headless-dialog label="Delete">Cannot be undone.</helix-headless-dialog>`,
    )
    expect(hasPart(markup, 'dialog')).toBe(true)
    expect(partTag(markup, 'dialog')).toMatch(/<dialog/)
    /* `toContain('Cannot be undone.')` read the host's own light-DOM child back
       out of the render, so it passed with the dialog rendering no slot at all.
       What puts the content inside the dialog is the slot inside the `<dialog>`,
       read off one with no children of its own. */
    const bare = ssr(html`<helix-headless-dialog label="Delete"></helix-headless-dialog>`)
    expect(rendered(bare, 'helix-headless-dialog')).toMatch(
      /<dialog[\s\S]*<slot><\/slot>[\s\S]*<\/dialog>/,
    )
  })

  test('open in the markup does not serve an open dialog', () => {
    // The attribute is the consumer's request; opening is something only a
    // browser can do, so the server serves it shut and the client opens it.
    expect(
      partTag(ssr(html`<helix-headless-dialog label="D" open>x</helix-headless-dialog>`), 'dialog'),
    ).not.toContain('open')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-dialog label="Delete">x</helix-headless-dialog>`),
        'helix-headless-dialog',
      ),
    ).toEqual(['label'])
  })
})
