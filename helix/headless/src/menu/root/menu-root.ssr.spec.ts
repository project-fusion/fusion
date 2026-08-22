import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('menu server output', () => {
  test('a closed menu serves its trigger and its panel, the panel hidden', () => {
    // Present and hidden rather than absent, so opening it after hydration is
    // an attribute coming off rather than a subtree arriving. The rows inside
    // are the consumer's own light-DOM children and were always in the HTML;
    // what the server adds is the frame around them.
    const markup = withoutStyles(ssr(html`<helix-menu label="Actions"></helix-menu>`))
    expect(markup).toContain('name="trigger"')
    expect(hasPart(markup, 'menu')).toBe(true)
    expect(partTag(markup, 'menu')).toContain('hidden')
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
    // `aria-haspopup` on a row that turns out to have no submenu is a promise
    // to a screen reader made on a guess, so the server declines to make it.
    const markup = ssr(
      html`<helix-menu-item value="more"
        ><helix-menu-item slot="submenu" value="x">X</helix-menu-item></helix-menu-item
      >`,
    )
    expect(withoutStyles(markup)).not.toContain('haspopup')
  })

  test('a checkable row serves its state', () => {
    expect(
      withoutStyles(ssr(html`<helix-menu-item checked value="wrap">Wrap</helix-menu-item>`)),
    ).toContain('menuitemcheckbox')
  })
})
