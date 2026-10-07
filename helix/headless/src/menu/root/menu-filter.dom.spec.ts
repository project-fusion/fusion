import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role, settle } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, for the reason the root's own spec gives. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & {
  filter: string
  filterMatch?: (text: string, filter: string) => boolean
  open: boolean
  show(): void
  updateComplete: Promise<boolean>
}
type Item = HTMLElement & { onPage: boolean; updateComplete: Promise<boolean> }

const ROWS = `<helix-headless-menu-item value="cut">Cut</helix-headless-menu-item>
  <helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
  <helix-headless-menu-item value="paste">Paste</helix-headless-menu-item>
  <helix-headless-menu-item value="share">Share
    <helix-headless-menu-item slot="submenu" value="mail">Mail</helix-headless-menu-item>
    <helix-headless-menu-item slot="submenu" value="link">Copy link</helix-headless-menu-item>
  </helix-headless-menu-item>`

/** A filterable menu, open, with its rows drawn. */
const opened = async (rows = ROWS): Promise<Menu> => {
  const host = (await mount(
    `<helix-headless-menu filterable label="Edit"><button slot="trigger">Edit</button>${rows}</helix-headless-menu>`,
  )) as Menu
  host.show()
  await settle(host)
  for (const row of host.querySelectorAll('helix-headless-menu-item')) {
    await (row as Item).updateComplete
  }
  return host
}

const row = (host: Menu, value: string): Item =>
  host.querySelector(`helix-headless-menu-item[value="${value}"]`) as Item

const field = (host: Menu): HTMLInputElement => part(host, 'search-field') as HTMLInputElement

/** Types into the field the way a reader does: the value, then `input`. */
const type = async (host: Menu, text: string): Promise<void> => {
  const input = field(host)
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await settle(host)
}

/** A key pressed in the field, which is where focus stays. */
const press = async (host: Menu, key: string): Promise<void> => {
  field(host).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
  await settle(host)
}

const highlighted = (host: Menu): string[] =>
  [...host.querySelectorAll('helix-headless-menu-item')]
    .filter((one) => hasState(one, 'highlighted'))
    .map((one) => one.getAttribute('value') ?? '')

describe('a filterable menu', () => {
  test('opens with focus in its field and the first row highlighted', async () => {
    const host = await opened()
    expect(field(host).getRootNode()).toBe(host.shadowRoot as ShadowRoot)
    expect((host.shadowRoot as ShadowRoot).activeElement).toBe(field(host))
    expect(highlighted(host)).toEqual(['cut'])
  })

  test('puts the field beside a `menu` that holds the rows, and each row says its role from its host', async () => {
    const host = await opened()
    expect(part(host, 'surface')?.getAttribute('role')).toBeNull()
    expect(host.shadowRoot?.querySelector('#items')?.getAttribute('role')).toBe('menu')
    expect(field(host).getAttribute('aria-controls')).toBe('items')
    expect(role(row(host, 'copy'))).toBe('menuitem')
    expect(
      row(host, 'copy').shadowRoot?.querySelector('[part="item"]')?.getAttribute('role'),
    ).toBeNull()
  })

  test('narrows the rows as the reader types, and highlights the first one kept', async () => {
    const host = await opened()
    await type(host, 'PA')
    expect(row(host, 'paste').onPage).toBe(true)
    expect(row(host, 'cut').onPage).toBe(false)
    expect(row(host, 'copy').onPage).toBe(false)
    expect(highlighted(host)).toEqual(['paste'])
  })

  test('Down and Up move the highlight through the rows kept, and focus stays in the field', async () => {
    const host = await opened()
    await type(host, 'c')
    /* Cut and Copy match, and Share's own words do not hold a "c". */
    await press(host, 'ArrowDown')
    expect(highlighted(host)).toEqual(['copy'])
    await press(host, 'ArrowDown')
    expect(highlighted(host)).toEqual(['cut'])
    await press(host, 'ArrowUp')
    expect(highlighted(host)).toEqual(['copy'])
    expect((host.shadowRoot as ShadowRoot).activeElement).toBe(field(host))
  })

  test('Enter chooses the highlighted row and closes the menu', async () => {
    const host = await opened()
    const chosen: string[] = []
    host.addEventListener('helix-select', (event) => {
      chosen.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    await type(host, 'copy')
    await press(host, 'Enter')
    await Promise.resolve()
    await settle(host)
    expect(chosen).toEqual(['copy'])
    expect(host.open).toBe(false)
    /* And the next opening starts with every row. */
    expect(host.filter).toBe('')
  })

  test('says so when the filter keeps no rows', async () => {
    const host = await opened()
    await type(host, 'zebra')
    expect(part(host, 'empty')?.textContent?.trim()).toBe('No matches')
    expect(part(host, 'live')?.textContent).toBe('No matches')
    expect(highlighted(host)).toEqual([])
  })

  test('Escape empties the filter, and a second Escape closes the menu', async () => {
    const host = await opened()
    await type(host, 'cu')
    await press(host, 'Escape')
    expect(host.filter).toBe('')
    expect(row(host, 'copy').onPage).toBe(true)
    expect(host.open).toBe(true)
    await press(host, 'Escape')
    expect(host.open).toBe(false)
  })

  test('Right opens a submenu, which starts unfiltered, and Left comes back', async () => {
    const host = await opened()
    await type(host, 'sh')
    expect(highlighted(host)).toEqual(['share'])
    await press(host, 'ArrowRight')
    await settle(host)
    expect(host.filter).toBe('')
    expect(highlighted(host)).toEqual(['mail'])
    await type(host, 'link')
    expect(row(host, 'link').onPage).toBe(true)
    expect(row(host, 'mail').onPage).toBe(false)
    await press(host, 'ArrowLeft')
    await settle(host)
    expect(highlighted(host)).toEqual(['share'])
  })

  test('a canceled helix-filter keeps every row, for a page that narrows them itself', async () => {
    const host = await opened()
    const heard: string[] = []
    host.addEventListener('helix-filter', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
      event.preventDefault()
    })
    await type(host, 'cu')
    expect(heard).toEqual(['cu'])
    expect(host.filter).toBe('cu')
    expect(row(host, 'copy').onPage).toBe(true)
  })

  test('filterMatch replaces how a row is matched', async () => {
    const host = await opened()
    host.filterMatch = (text, filter) => text.toLowerCase().startsWith(filter.toLowerCase())
    await type(host, 'aste')
    expect(row(host, 'paste').onPage).toBe(false)
    await type(host, 'pa')
    expect(row(host, 'paste').onPage).toBe(true)
  })

  test('a menu without `filterable` draws no field and keeps its rows focusable', async () => {
    const host = (await mount(
      `<helix-headless-menu><button slot="trigger">Edit</button>${ROWS}</helix-headless-menu>`,
    )) as Menu
    host.show()
    await settle(host)
    expect(part(host, 'search-field')).toBeNull()
    expect(part(host, 'surface')?.getAttribute('role')).toBe('menu')
    await row(host, 'cut').updateComplete
    expect(row(host, 'cut').shadowRoot?.querySelector('[part="item"]')?.getAttribute('role')).toBe(
      'menuitem',
    )
  })
})
