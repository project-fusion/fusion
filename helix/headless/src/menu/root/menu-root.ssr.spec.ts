import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('menu server output', () => {
  test('a closed menu serves its trigger and its panel, the panel hidden', () => {
    // Present and hidden rather than absent, so opening it after hydration is
    // an attribute coming off rather than a subtree arriving. The rows inside
    // are the consumer's own light-DOM children and were always in the HTML;
    // what the server adds is the frame around them.
    const markup = withoutStyles(
      ssr(html`<helix-headless-menu label="Actions"></helix-headless-menu>`),
    )
    expect(rendered(markup, 'helix-headless-menu')).toMatch(/<slot\s+name="trigger"/)
    expect(hasPart(markup, 'surface')).toBe(true)
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  test('an open menu serves back what was typed and nothing else', () => {
    /* Sorted by the helper, so this is a set rather than an order. The open
       state lives in `ElementInternals.states`, which no server writes and no
       hydration reconciles. */
    expect(
      hostAttributes(
        ssr(html`<helix-headless-menu label="A" open></helix-headless-menu>`),
        'helix-headless-menu',
      ),
    ).toEqual(['label', 'open'])
  })

  test('a row serves its words and its role', () => {
    // The words are the consumer's own, so what the row owes is the slot they
    // land in. Read off a render with no children, since a slotted word sits in
    // the served markup whatever the row does with it.
    const markup = ssr(html`<helix-headless-menu-item value="copy"></helix-headless-menu-item>`)
    expect(partTag(markup, 'item')).toContain('role="menuitem"')
    expect(rendered(markup, 'helix-headless-menu-item')).toContain('<slot></slot>')
  })

  test('a row claims no submenu on the server, because it cannot see its children', () => {
    // `aria-haspopup` on a row that turns out to have no submenu is a promise
    // to a screen reader made on a guess, so the server declines to make it.
    const markup = ssr(
      html`<helix-headless-menu-item value="more"
        ><helix-headless-menu-item slot="submenu" value="x">X</helix-headless-menu-item></helix-headless-menu-item
      >`,
    )
    expect(withoutStyles(markup)).not.toContain('haspopup')
  })

  test('a checkable row serves its state', () => {
    const markup = ssr(
      html`<helix-headless-menu-item checked value="wrap">Wrap</helix-headless-menu-item>`,
    )
    expect(partTag(markup, 'item')).toContain('role="menuitemcheckbox"')
    expect(partTag(markup, 'item')).toContain('aria-checked="true"')
  })

  test('`default-open` serves the page showing rather than opening it on upgrade', () => {
    /* The panel is rendered either way and `open` decides which of the two the
       reader is served: resolved on the first client update instead, a menu
       declared open appears after the first paint, over content that had
       already been laid out without it. */
    const open = ssr(
      html`<helix-headless-menu default-open label="Actions"
        ><button slot="trigger">Open</button></helix-headless-menu
      >`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)

    const shut = ssr(
      html`<helix-headless-menu label="Actions"
        ><button slot="trigger">Open</button></helix-headless-menu
      >`,
    )
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
  })
})
