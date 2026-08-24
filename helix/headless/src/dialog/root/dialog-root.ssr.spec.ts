import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
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
    expect(withoutStyles(markup)).toContain('Cannot be undone.')
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
