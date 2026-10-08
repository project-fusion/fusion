import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import './index.js'

/* The entry gives a filterable menu its field on the server too, so the
   panel a reader opens before hydration holds the field it will type in. */
describe('a filterable menu on the server, with the filter entry imported', () => {
  const menu = (filterable: boolean): string =>
    ssr(html`<helix-headless-menu label="Move to" ?filterable=${filterable}>
      <helix-headless-menu-item value="inbox">Inbox</helix-headless-menu-item>
    </helix-headless-menu>`)

  test('serves the field, and the rows in a `menu` beside it', () => {
    const markup = menu(true)
    expect(hasPart(markup, 'search-field')).toBe(true)
    expect(rendered(markup, 'helix-headless-menu')).toMatch(/id="items"\s+role="menu"/)
  })

  test('serves a menu that does not filter as it served one before the entry', () => {
    expect(hasPart(menu(false), 'search-field')).toBe(false)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(menu(true), 'helix-headless-menu')).toEqual(['filterable', 'label'])
  })
})
