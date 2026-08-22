import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const bar = html`<helix-navigation label="Sections">
  <a aria-current="page" data-navigation-item href="/design">Design</a>
  <a data-navigation-item href="/mind">Mind</a>
</helix-navigation>`

describe('nav bar server output', () => {
  test('the landmark and its name are served', () => {
    // A page can hold more than one navigation, and landmarks are how a
    // screen-reader user chooses between them.
    expect(partTag(ssr(bar), 'nav')).toContain('aria-label="Sections"')
  })

  test('links are in the document, not behind a shadow root', () => {
    // They are slotted, so a crawler and a router both see real anchors.
    expect(withoutStyles(ssr(bar))).toContain('href="/design"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(bar), 'helix-navigation')).toEqual(['label'])
  })
})
