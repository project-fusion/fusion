import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* A set of tags as one control: a grid of rows with one tab stop, moved through
   with the arrow keys, emptied with Delete and Backspace, and selected with
   Space where the group selects. React Aria's TagGroup is the peer. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tag = HTMLElement & {
  focusable?: boolean
  selected?: boolean
  updateComplete: Promise<unknown>
}
type Group = HTMLElement & { updateComplete: Promise<unknown>; value: string }

const group = async (attributes: string, tags: string): Promise<{ group: Group; tags: Tag[] }> => {
  const host = await mount(
    `<helix-headless-tag-group label="Fruit" ${attributes}>${tags}</helix-headless-tag-group>`,
  )
  const found = host as Group
  await found.updateComplete
  const all = [...found.querySelectorAll('helix-headless-tag')] as Tag[]
  for (const one of all) {
    await one.updateComplete
  }
  return { group: found, tags: all }
}

const FRUIT =
  '<helix-headless-tag dismissible>Apple</helix-headless-tag><helix-headless-tag dismissible disabled>Pear</helix-headless-tag><helix-headless-tag dismissible>Plum</helix-headless-tag>'

const cell = (tag: Tag): HTMLElement => part(tag, 'cell') as HTMLElement

const press = (tag: Tag, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  cell(tag).dispatchEvent(event)
  return event
}

const settle = async (one: { group: Group; tags: Tag[] }): Promise<void> => {
  await one.group.updateComplete
  for (const tag of one.tags) {
    await tag.updateComplete
  }
}

describe('a tag group', () => {
  test('is a grid of rows, each with a cell, and named by `label`', async () => {
    const one = await group('', FRUIT)
    const internals = (one.group as unknown as { internals: ElementInternals }).internals
    expect([internals.role, internals.ariaLabel]).toEqual(['grid', 'Fruit'])
    const rows = one.tags.map(
      (tag) => (tag as unknown as { internals: ElementInternals }).internals,
    )
    expect(rows.map((row) => row.role)).toEqual(['row', 'row', 'row'])
    expect(one.tags.map((tag) => cell(tag)?.getAttribute('role'))).toEqual([
      'gridcell',
      'gridcell',
      'gridcell',
    ])
  })

  /* One tab stop for the set, and the remove buttons out of the tab order. */
  test('holds one tab stop, on the first tag, and keeps the remove buttons out of the order', async () => {
    const one = await group('', FRUIT)
    expect(one.tags.map((tag) => cell(tag).getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(part(one.tags[0] as Tag, 'dismiss')?.getAttribute('tabindex')).toBe('-1')
  })

  test('moves with the arrow keys and passes over a disabled tag', async () => {
    const one = await group('', FRUIT)
    cell(one.tags[0] as Tag).focus()
    press(one.tags[0] as Tag, 'ArrowRight')
    await settle(one)
    expect(document.activeElement).toBe(one.tags[2] as Element)
    expect(one.tags.map((tag) => cell(tag).getAttribute('tabindex'))).toEqual(['-1', '-1', '0'])
  })

  test('goes to the ends with Home and End, and does not wrap', async () => {
    const one = await group('', FRUIT)
    cell(one.tags[0] as Tag).focus()
    press(one.tags[0] as Tag, 'End')
    expect(document.activeElement).toBe(one.tags[2] as Element)
    press(one.tags[2] as Tag, 'ArrowRight')
    expect(document.activeElement).toBe(one.tags[2] as Element)
  })

  /* Delete and Backspace send the tag's own dismiss, so a handler removes it,
     and focus moves to the next row rather than to the body. */
  test('removes the focused tag with Delete, and hands focus to the next row', async () => {
    const one = await group('', FRUIT)
    const [apple, , plum] = one.tags as [Tag, Tag, Tag]
    apple.addEventListener('helix-dismiss', () => apple.remove())
    cell(apple).focus()
    expect(press(apple, 'Delete').defaultPrevented).toBe(true)
    expect(apple.isConnected).toBe(false)
    expect(plum.shadowRoot?.activeElement).toBe(cell(plum))
  })

  test('does not remove a tag that is not dismissible, or a disabled one', async () => {
    const one = await group(
      '',
      '<helix-headless-tag>Apple</helix-headless-tag><helix-headless-tag dismissible disabled>Pear</helix-headless-tag>',
    )
    let sent = 0
    one.group.addEventListener('helix-dismiss', () => {
      sent += 1
    })
    press(one.tags[0] as Tag, 'Backspace')
    press(one.tags[1] as Tag, 'Delete')
    expect(sent).toBe(0)
  })
})

describe('selecting tags', () => {
  test('carries no selected state where the group selects nothing', async () => {
    const one = await group('', FRUIT)
    expect(one.tags.map((tag) => tag.selected)).toEqual([undefined, undefined, undefined])
  })

  test('selects one at a time with Space, asking first and telling after', async () => {
    const one = await group(
      'selection-mode="single"',
      '<helix-headless-tag value="a">Apple</helix-headless-tag><helix-headless-tag>Plum</helix-headless-tag>',
    )
    const heard: string[] = []
    one.group.addEventListener('helix-before-change', (event) =>
      heard.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    one.group.addEventListener('change', () => heard.push(`change ${one.group.value}`))
    press(one.tags[0] as Tag, ' ')
    press(one.tags[1] as Tag, ' ')
    await settle(one)
    expect(heard).toEqual(['a', 'change a', 'Plum', 'change Plum'])
    expect(one.tags.map((tag) => tag.selected)).toEqual([false, true])
    const internals = (one.tags[1] as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaSelected).toBe('true')
  })

  test('selects any number on a press, and says so on the grid', async () => {
    const one = await group('selection-mode="multiple" value="Plum"', FRUIT)
    expect(one.tags.map((tag) => tag.selected)).toEqual([false, false, true])
    cell(one.tags[0] as Tag).click()
    await settle(one)
    expect(one.group.value).toBe('Plum, Apple')
    const internals = (one.group as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaMultiSelectable).toBe('true')
  })

  test('keeps the selection when the request is refused, and never selects a disabled tag', async () => {
    const one = await group('selection-mode="multiple"', FRUIT)
    one.group.addEventListener('helix-before-change', (event) => event.preventDefault(), {
      once: true,
    })
    press(one.tags[0] as Tag, ' ')
    press(one.tags[1] as Tag, ' ')
    expect(one.group.value).toBe('')
  })

  /* A press on a remove button is a press on that button, not on the tag. */
  test('does not take a press on the remove button for a selection', async () => {
    const one = await group('selection-mode="multiple"', FRUIT)
    ;(part(one.tags[0] as Tag, 'dismiss') as HTMLElement).click()
    expect(one.group.value).toBe('')
  })
})

/* What a removal leaves behind: RAC's useListData takes a removed key out of
   the selection, and focus never drops to the page. */
describe('a tag removed from a group', () => {
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

  test('takes its value out of `value` where it was selected, and says so', async () => {
    const one = await group('selection-mode="multiple" value="Apple, Plum"', FRUIT)
    const heard: string[] = []
    one.group.addEventListener('change', () => heard.push(one.group.value))
    one.group.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    const plum = one.tags[2] as Tag
    cell(plum).focus()
    press(plum, 'Delete')
    await frame()
    expect([one.group.value, heard]).toEqual(['Apple', ['Apple']])
  })

  test('leaves `value` alone where it was not selected, or the removal was refused', async () => {
    const one = await group('selection-mode="multiple" value="Apple"', FRUIT)
    one.group.addEventListener('helix-dismiss', (event) => event.preventDefault(), { once: true })
    press(one.tags[0] as Tag, 'Delete')
    await frame()
    one.group.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    press(one.tags[2] as Tag, 'Delete')
    await frame()
    expect(one.group.value).toBe('Apple')
  })

  test('as the last one keeps focus in the group, which is then a group of nothing', async () => {
    const one = await group(
      '',
      '<helix-headless-tag dismissible>Apple</helix-headless-tag><span slot="empty">No fruit</span>',
    )
    one.group.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    const apple = one.tags[0] as Tag
    cell(apple).focus()
    press(apple, 'Delete')
    await frame()
    await one.group.updateComplete
    const empty = part(one.group, 'empty') as HTMLElement
    expect(one.group.shadowRoot?.activeElement).toBe(empty)
    const internals = (one.group as unknown as { internals: ElementInternals }).internals
    expect(internals.role).toBe('group')
  })

  test('renders no `empty` part while there are tags', async () => {
    const one = await group('', FRUIT)
    expect(part(one.group, 'empty')).toBeNull()
  })
})

/* A row's name was its content, so a tag called Open with a remove button read
   "Open Remove Open". React Aria names the row by its text. */
describe('a row', () => {
  test('is named by its words alone, its category first', async () => {
    const one = await group(
      '',
      '<helix-headless-tag dismissible><span slot="start">Status</span>Open</helix-headless-tag>',
    )
    const tag = one.tags[0] as Tag
    await tag.updateComplete
    const internals = (tag as unknown as { internals: ElementInternals }).internals
    expect([internals.ariaLabel, cell(tag).getAttribute('aria-label')]).toEqual([
      'Status Open',
      'Status Open',
    ])
  })

  test('and a tag on its own is named as it was', async () => {
    await mount('<helix-headless-tag dismissible>Open</helix-headless-tag>')
    const tag = document.querySelector('helix-headless-tag') as Tag
    await tag.updateComplete
    const internals = (tag as unknown as { internals: ElementInternals }).internals
    expect(internals.ariaLabel).toBeNull()
  })
})

describe('a link tag in a group', () => {
  test('follows its link on Enter, its link being out of the tab order', async () => {
    const one = await group('', '<helix-headless-tag href="#apple">Apple</helix-headless-tag>')
    const link = part(one.tags[0] as Tag, 'link') as HTMLElement
    expect(link.getAttribute('tabindex')).toBe('-1')
    let followed = 0
    link.addEventListener('click', (event) => {
      event.preventDefault()
      followed += 1
    })
    press(one.tags[0] as Tag, 'Enter')
    expect(followed).toBe(1)
  })
})
