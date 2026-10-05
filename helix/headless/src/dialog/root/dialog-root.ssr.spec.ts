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
      /<dialog[\s\S]*<slot\s+part="body"\s*><\/slot>[\s\S]*<\/dialog>/,
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

  test('the light-dismiss policy reaches the real dialog, which is what acts on it', () => {
    /* `closedby` is the platform's, and the platform reads it off the `<dialog>`
       rather than off anything around it. Nothing in this component interprets
       it, so a binding that stopped forwarding leaves a dialog at the browser's
       own default with the property still reading what the consumer set: a
       backdrop press that was supposed to dismiss, and does not. */
    expect(
      partTag(
        ssr(html`<helix-headless-dialog closedby="any" label="Delete">x</helix-headless-dialog>`),
        'dialog',
      ),
    ).toContain('closedby="any"')
  })

  test('and a dialog that named no policy carries none', () => {
    /* Absent rather than written at a default: `closedby="none"` refuses the
       Escape key, so a dialog that had merely not been told would trap a reader
       in it. */
    expect(
      partTag(ssr(html`<helix-headless-dialog label="Delete">x</helix-headless-dialog>`), 'dialog'),
    ).not.toContain('closedby')
  })
})

describe('dialog server output, the new parts', () => {
  test('the regions are served as parts on their slots, and no close control unless asked', () => {
    const bare = rendered(
      ssr(html`<helix-headless-dialog label="Delete"></helix-headless-dialog>`),
      'helix-headless-dialog',
    )
    expect(bare).toMatch(/<slot\s+name="header"\s+part="header"/)
    expect(bare).toMatch(/<slot\s+name="footer"\s+part="footer"/)
    expect(bare).not.toContain('part="dismiss"')
    expect(bare).not.toContain('alertdialog')
  })

  test('an alert dialog and a close control are served as the client renders them', () => {
    const served = rendered(
      ssr(html`<helix-headless-dialog alert dismissible label="Delete"></helix-headless-dialog>`),
      'helix-headless-dialog',
    )
    expect(served).toMatch(/<dialog[^>]*role="alertdialog"/s)
    expect(served).toMatch(/<button\s+part="dismiss"\s+type="button"\s+aria-label="Close"/)
  })
})
