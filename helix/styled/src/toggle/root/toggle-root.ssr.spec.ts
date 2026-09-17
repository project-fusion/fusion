import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toggle server output', () => {
  test('the item ships as a real radio, named by its own words', () => {
    const markup = ssr(html`<helix-toggle value="light">Light</helix-toggle>`)
    expect(partTag(markup, 'item')).toContain('role="radio"')
    expect(rendered(markup, 'helix-toggle')).toContain('<slot></slot>')
  })

  /**
   * **A set nothing has answered for is still reachable**, for the reason
   * `Radio.Root`'s own server spec writes out: `selected` and `focusable` are
   * both the group's word, a server has no children for the group to read, and
   * `-1` on every item is a claim about a stop that does not exist yet.
   */
  test('an item nothing has answered for is in the tab order rather than out of it', () => {
    expect(partTag(ssr(html`<helix-toggle value="light"></helix-toggle>`), 'item')).toContain(
      'tabindex="0"',
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(ssr(html`<helix-toggle value="light"></helix-toggle>`), 'helix-toggle'),
    ).toEqual(['value'])
  })
})
