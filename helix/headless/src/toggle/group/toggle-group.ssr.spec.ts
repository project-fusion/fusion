import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-headless-toggle-group label="Color mode" value="light">
  <helix-headless-toggle value="light">Light</helix-headless-toggle>
  <helix-headless-toggle value="dark">Dark</helix-headless-toggle>
</helix-headless-toggle-group>`

/* Markup the consumer wrote is declared as such here. `toContain('Light')` on
   the whole document was the assertion before, and the word is the item's own
   light DOM: it passed whether or not anything rendered, which is the shape
   `rendered` and `namesControl` were added for. The group's own name is a part
   it draws, and the item's label reaches the page through a slot, so the two
   are asked for separately. */
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

  test('the group names itself in markup, not on the first client render', () => {
    expect(partTag(ssr(group), 'label')).not.toBe('')
  })

  test('the group role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-toggle-group')).toEqual(['label', 'value'])
  })

  test('an item carries only the attributes the consumer gave it', () => {
    /* `selected` is resolved from the group's value on the client. Reflecting it
       on the server would put an attribute on markup React never had.

       A consumer whose first paint has to be right writes `selected` on the
       item instead, which is their own markup and serves as `aria-checked`, and
       `sync` takes that declaration as the group's value rather than clearing
       it. `Tabs` records the same arrangement. */
    expect(hostAttributes(ssr(group), 'helix-headless-toggle')).toEqual(['value'])
  })
  test('a group showing feedback renders on a server, where it has no items to point at', () => {
    /* Feedback sets a custom validity, which asks the group where focus would
       land, and the server has no children to answer from. It threw there,
       and every example with feedback failed to serve. */
    const markup = ssr(
      html`<helix-headless-toggle-group feedback="Choose one to continue" label="L"></helix-headless-toggle-group>`,
    )
    expect(rendered(markup, 'helix-headless-toggle-group')).toContain('Choose one to continue')
  })
})
