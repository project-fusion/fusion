import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { CSSResult } from 'lit'

/* Imported after registration, as every element is, so Lit reads the DOM the
   specs run in. The filter is an entry of its own, beside the menu's. */
let styles: CSSResult
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('./index.js')
  ;({ styles } = await import('./menu-filter.css.js'))
})

type Menu = Updatable & { filterable: boolean; show(): void }

const menu = async (attributes: string): Promise<Menu> => {
  const host = (await mount(`<helix-menu ${attributes}>
    <button slot="trigger">Move to</button>
    <helix-menu-item value="inbox">Inbox</helix-menu-item>
    <helix-menu-item value="archive">Archive</helix-menu-item>
  </helix-menu>`)) as Menu
  host.show()
  await settle(host)
  return host
}

/* Whether the menu holds the sheet the entry hands it. happy-dom resolves no
   cascade, so what can be held here is that the sheet is there and what it
   draws. */
const adopted = (host: HTMLElement): boolean =>
  (host.shadowRoot?.adoptedStyleSheets ?? []).includes(styles.styleSheet as CSSStyleSheet)

describe('a filterable styled menu', () => {
  test('draws its field and adopts the sheet that draws it', async () => {
    const host = await menu('filterable')
    expect(part(host, 'search-field')).not.toBeNull()
    expect(adopted(host)).toBe(true)
    expect(styles.cssText).toContain('input {')
  })

  test('gives the sheet back when it stops filtering, and a menu that never filters holds none', async () => {
    const host = await menu('filterable')
    host.filterable = false
    await settle(host)
    expect(part(host, 'search-field')).toBeNull()
    expect(adopted(host)).toBe(false)
    expect(adopted(await menu(''))).toBe(false)
  })
})
