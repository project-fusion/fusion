import { describe, expect, test } from 'bun:test'
import { partTag, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('lightbox item server output', () => {
  test('an item that is not current ships hidden', () => {
    /* Which item is current is the root's decision and the root has not made it
       yet, so the server's answer is the honest one: every item hidden, and the
       one being shown revealed on hydration rather than flashing all of them. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox-item value="one"></helix-headless-lightbox-item>`),
    )
    expect(partTag(markup, 'item')).toContain('hidden')
  })

  test('the current one ships shown, for a viewer rendered open', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-lightbox-item value="one" .current=${true}></helix-headless-lightbox-item>`,
      ),
    )
    expect(partTag(markup, 'item')).not.toContain('hidden')
  })

  test('what was slotted is in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-lightbox-item value="one"></helix-headless-lightbox-item>`),
    )
    expect(rendered(markup, 'helix-headless-lightbox-item')).toContain('<slot></slot>')
  })
})
