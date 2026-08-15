import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('menu server output', () => {
  test('a closed menu serves its trigger and no panel', () => {
    // The rows are the consumer"s light-DOM children and the surface is drawn
    // around them on the client, so there is no hidden panel in the served
    // HTML for a reader or a crawler to find.
    // The panel is a `popover`, which only a browser can show, and its rows are
    // the consumer's light-DOM children. So the server sends the trigger slot
    // and nothing else: there is no hidden panel in the HTML.
    const markup = withoutStyles(ssr(html`<helix-menu label="Actions"></helix-menu>`))
    expect(markup).toContain('name="trigger"')
    expect(hasPart(markup, 'menu')).toBe(false)
  })

  test('open reaches the served markup as the hook the styles select on', () => {
    // Sorted by the helper, so this is a set rather than an order.
    expect(
      hostAttributes(ssr(html`<helix-menu label="A" open></helix-menu>`), 'helix-menu'),
    ).toEqual(['data-open', 'label', 'open'])
  })

  test('a row serves its words and its role', () => {
    const markup = ssr(html`<helix-menu-item value="copy">Copy</helix-menu-item>`)
    expect(hasPart(markup, 'item')).toBe(true)
    expect(withoutStyles(markup)).toContain('menuitem')
  })

  test('a row claims no submenu on the server, because it cannot see its children', () => {
    // `aria-haspopup` on a row that has no submenu is a promise to a screen
    // reader made on a guess, so the server declines to make it.
    const markup = ssr(
      html`<helix-menu-item value="more"><helix-menu-item slot="submenu" value="x">X</helix-menu-item></helix-menu-item>`,
    )
    expect(withoutStyles(markup)).not.toContain('haspopup')
  })

  test('a checkable row serves its state', () => {
    expect(
      withoutStyles(ssr(html`<helix-menu-item checked value="wrap">Wrap</helix-menu-item>`)),
    ).toContain('menuitemcheckbox')
  })
})
