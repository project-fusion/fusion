import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const row = async (attributes = ''): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-menu-item ${attributes}>Open</helix-headless-menu-item>`,
  )) as HTMLElement

/**
 * One menu row, and the contract that is the row's rather than the menu's.
 *
 * **The menu already proves the coordination**, which is roving focus, typeahead
 * and which row a chosen value came from. What the row decides alone is which
 * *element* it is, and that decision is invisible from the menu, because a menu
 * made of anchors and a menu made of divs behave identically until a reader
 * reaches one with a screen reader or a middle click.
 */
describe('one menu row', () => {
  /* The anchor is the row rather than something inside it. A `menuitem`
     containing a link loses its accessible name in Chromium, so `href` changes
     the tag and takes the role with it. Asserting the tag is the only way to
     see that: both shapes carry `part="item"` and both read the same. */
  test('becomes the anchor rather than wrapping one, and keeps the role on it', async () => {
    const linked = await row('href="/docs"')
    const item = part(linked, 'item')
    expect(item?.tagName).toBe('A')
    expect(item?.getAttribute('role')).toBe('menuitem')
    expect(item?.getAttribute('href')).toBe('/docs')
    expect(item?.querySelector('a')).toBeNull()

    const plain = await row()
    expect(part(plain, 'item')?.tagName).toBe('DIV')
  })

  /* A disabled anchor is not a thing the platform has, and `aria-disabled` alone
     still navigates, so a refusing row gives up the `href` rather than dressing
     it. This is the row's own judgment: the menu never sees the difference. */
  test('renders no destination when it is refusing, rather than a dressed one', async () => {
    const host = await row('href="/docs" disabled')
    const item = part(host, 'item')
    expect(item?.tagName).toBe('DIV')
    expect(item?.hasAttribute('href')).toBe(false)
    expect(item?.getAttribute('aria-disabled')).toBe('true')
    expect(item?.hasAttribute('tabindex')).toBe(false)
  })

  /* An unticked choice is still a choice, which is the whole reason `checkable`
     exists beside `checked`. Announced as a plain `menuitem` it would tell a
     reader its siblings are commands. */
  test('announces an unticked choice as a choice, not as a command', async () => {
    const off = await row('checkable')
    expect(part(off, 'item')?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(part(off, 'item')?.getAttribute('aria-checked')).toBe('false')

    const on = await row('checked')
    expect(part(on, 'item')?.getAttribute('role')).toBe('menuitemcheckbox')
    expect(part(on, 'item')?.getAttribute('aria-checked')).toBe('true')

    const command = await row()
    expect(part(command, 'item')?.getAttribute('role')).toBe('menuitem')
    expect(part(command, 'item')?.hasAttribute('aria-checked')).toBe(false)
  })
})

/* The two boxes either side of a label are drawn only where there is something
   to put in them. What keeps the labels on one edge is the track the menu
   reserves for the page, not a box on every row, so these say the box is absent
   and the alignment is somebody else's job. */
describe('a row draws no box it has nothing to put in', () => {
  const filled = async (inner: string): Promise<HTMLElement> =>
    (await mount(
      `<helix-headless-menu-item value="a">${inner}</helix-headless-menu-item>`,
    )) as HTMLElement

  test('no leading mark, so the leading box takes no space', async () => {
    const el = await filled('Copy')
    expect(part(el, 'start')?.hasAttribute('data-empty')).toBe(true)
  })

  test('a leading mark, so it does', async () => {
    const el = await filled('<span slot="start">C</span>Copy')
    expect(part(el, 'start')?.hasAttribute('data-empty')).toBe(false)
  })

  /* The slot stays rendered even while its box does not, which is what makes a
     mark added after first render still arrive. */
  test('the slot is there either way, so a mark arriving later is noticed', async () => {
    const el = await filled('Copy')
    expect(el.shadowRoot?.querySelector('slot[name="start"]')).not.toBeNull()
  })

  test('nothing to tick and no page to open, so no trailing mark is drawn', async () => {
    const el = await filled('Copy')
    expect(part(el, 'mark')).toBeNull()
  })

  /* **A row that can be ticked and is not draws nothing either**, which is the
     case an empty box used to cover. Nothing is lost by it: `aria-checked` is on
     the row and says the state, and the column stays open because the menu
     reserved it for the page the moment one row on it became checkable. */
  test('a row that can be ticked and is not draws nothing', async () => {
    const el = (await mount(
      '<helix-headless-menu-item checkable value="a">Copy</helix-headless-menu-item>',
    )) as HTMLElement
    expect(part(el, 'mark')).toBeNull()
  })

  test('and ticking it draws the tick', async () => {
    const el = (await mount(
      '<helix-headless-menu-item checkable checked value="a">Copy</helix-headless-menu-item>',
    )) as HTMLElement
    expect(part(el, 'mark')).not.toBeNull()
  })
})

describe('choosing a row that can be ticked', () => {
  type Row = HTMLElement & { checked: boolean; updateComplete: Promise<boolean> }

  const rows = async (markup: string): Promise<Row[]> => {
    const host = await mount(`<div>${markup}</div>`)
    const found = [...host.querySelectorAll('helix-headless-menu-item')] as Row[]
    for (const one of found) {
      await one.updateComplete
    }
    return found
  }

  const choose = async (row: Row): Promise<void> => {
    ;(part(row, 'item') as HTMLElement).click()
    await row.updateComplete
  }

  test('ticks and unticks it, and a listener reads the new state', async () => {
    const [row] = (await rows(
      '<helix-headless-menu-item checkable value="a">Show hidden</helix-headless-menu-item>',
    )) as [Row]
    let heard: boolean | undefined
    row.addEventListener('helix-select', () => {
      heard = row.checked
    })
    await choose(row)
    expect(row.checked).toBe(true)
    expect(heard).toBe(true)
    expect(part(row, 'item')?.getAttribute('aria-checked')).toBe('true')
    await choose(row)
    expect(row.checked).toBe(false)
  })

  test('records the state without writing the attribute', async () => {
    const [row] = (await rows(
      '<helix-headless-menu-item checkable value="a">Show hidden</helix-headless-menu-item>',
    )) as [Row]
    await choose(row)
    expect(row.hasAttribute('checked')).toBe(false)
    expect(hasState(row, 'checked')).toBe(true)
  })

  test('asks first, and a refusal keeps the row as it is', async () => {
    const [row] = (await rows(
      '<helix-headless-menu-item checkable value="a">Show hidden</helix-headless-menu-item>',
    )) as [Row]
    row.addEventListener('helix-before-toggle', (event) => event.preventDefault())
    await choose(row)
    expect(row.checked).toBe(false)
  })

  test('an exclusive row turns its run on and off, and stops at a divider', async () => {
    const found = await rows(`
      <helix-headless-menu-item checkable exclusive checked value="name">Name</helix-headless-menu-item>
      <helix-headless-menu-item checkable exclusive value="date">Date</helix-headless-menu-item>
      <hr />
      <helix-headless-menu-item checkable exclusive checked value="asc">Ascending</helix-headless-menu-item>`)
    await choose(at(found, 1))
    expect(found.map((one) => one.checked)).toEqual([false, true, true])
    /* Choosing the row that is on leaves it on, as a radio does. */
    await choose(at(found, 1))
    expect(found.map((one) => one.checked)).toEqual([false, true, true])
  })
})

describe('the row the keyboard is on', () => {
  /* `Option` calls it `active`, and `selected` is kept for code that reads it. */
  test('is active while it has focus, and selected still says the same', async () => {
    const one = (await row()) as unknown as HTMLElement & {
      active: boolean
      focusItem(): void
      selected: boolean
    }
    expect(one.active).toBe(false)
    one.focusItem()
    expect(one.active).toBe(true)
    expect(one.selected).toBe(true)
  })
})

describe('a row with a shortcut', () => {
  /* WA's dropdown item details and React Aria's keyboard slot: the shortcut is
     drawn after the label, and the row says it to a screen reader. */
  test('draws the key after the label and gives the row aria-keyshortcuts', async () => {
    const host = (await mount(
      '<helix-headless-menu-item shortcut="mod+s">Save</helix-headless-menu-item>',
    )) as HTMLElement & { updateComplete: Promise<unknown> }
    const key = part(host, 'shortcut') as HTMLElement & { keys: string }
    expect(key.localName).toBe('helix-headless-kbd')
    expect(key.keys).toBe('mod+s')
    expect(part(host, 'end')?.hasAttribute('data-empty')).toBe(false)
    expect(['Control+S', 'Meta+S']).toContain(
      part(host, 'item')?.getAttribute('aria-keyshortcuts') ?? '',
    )
  })

  test('a row with neither a shortcut nor end content leaves its trailing column empty', async () => {
    const host = await mount('<helix-headless-menu-item>Save</helix-headless-menu-item>')
    expect(part(host, 'end')?.hasAttribute('data-empty')).toBe(true)
    expect(part(host, 'item')?.hasAttribute('aria-keyshortcuts')).toBe(false)
  })
})
