import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-headless-toggle-group label="Color mode" value="light">
  <helix-headless-toggle value="light">Light</helix-headless-toggle>
  <helix-headless-toggle value="dark">Dark</helix-headless-toggle>
</helix-headless-toggle-group>`

describe('toggle group server output', () => {
  test('the labels are projected, not built on the client', () => {
    /* `toContain('Light')` was the word the spec itself slotted onto a toggle,
       so it held whatever either element rendered. What the pair owes is the
       track the group projects its items into and the button an item projects
       its word into, both read off renders with no children. */
    const empty = ssr(
      html`<helix-headless-toggle-group label="Color mode"></helix-headless-toggle-group>`,
    )
    expect(hasPart(empty, 'track')).toBe(true)
    const item = ssr(html`<helix-headless-toggle value="light"></helix-headless-toggle>`)
    expect(partTag(item, 'item')).toContain('role="radio"')
    expect(rendered(item, 'helix-headless-toggle')).toContain('<slot></slot>')
  })

  test('the group role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-toggle-group')).toEqual(['label', 'value'])
  })

  test('an item carries only the attributes the consumer gave it', () => {
    // `selected` is resolved from the group's value on the client. Reflecting
    // it on the server would put an attribute on markup React never had.
    expect(hostAttributes(ssr(group), 'helix-headless-toggle')).toEqual(['value'])
  })
})
