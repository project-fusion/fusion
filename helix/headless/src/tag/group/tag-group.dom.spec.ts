import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasState,
  internalsOf,
  mount,
  notYetDefined,
  part,
  registerDom,
  role,
} from '@fusion.dev/helix-testing/dom'

/* A set of tags as one control: a grid of rows with one tab stop, moved through
   with the arrow keys, emptied with Delete and Backspace, and selected with
   Space where the group selects. React Aria's TagGroup is the peer. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* A spec that patches a prototype puts it back here. */
let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
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
    const internals = internalsOf(one.group)
    expect([internals.role, internals.ariaLabel]).toEqual(['grid', 'Fruit'])
    const rows = one.tags.map((tag) => internalsOf(tag))
    expect(rows.map((row) => row.role)).toEqual(['row', 'row', 'row'])
    expect(one.tags.map((tag) => cell(tag)?.getAttribute('role'))).toEqual([
      'gridcell',
      'gridcell',
      'gridcell',
    ])
  })

  /* One tab stop for the set, and the remove buttons out of the tab order. A
     disabled tag's cell takes no focus at all: with `tabindex="-1"` Chromium
     exposed it as focusable, though the arrow keys pass over it. */
  test('holds one tab stop, on the first tag, and keeps the remove buttons out of the order', async () => {
    const one = await group('', FRUIT)
    expect(one.tags.map((tag) => cell(tag).getAttribute('tabindex'))).toEqual(['0', null, '-1'])
    expect(part(one.tags[0] as Tag, 'dismiss')?.getAttribute('tabindex')).toBe('-1')
  })

  test('moves with the arrow keys and passes over a disabled tag', async () => {
    const one = await group('', FRUIT)
    cell(one.tags[0] as Tag).focus()
    press(one.tags[0] as Tag, 'ArrowRight')
    await settle(one)
    expect(document.activeElement).toBe(one.tags[2] as Element)
    expect(one.tags.map((tag) => cell(tag).getAttribute('tabindex'))).toEqual(['-1', null, '0'])
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
    const internals = internalsOf(one.tags[1])
    expect(internals.ariaSelected).toBe('true')
  })

  test('selects any number on a press, and says so on the grid', async () => {
    const one = await group('selection-mode="multiple" value="Plum"', FRUIT)
    expect(one.tags.map((tag) => tag.selected)).toEqual([false, false, true])
    cell(one.tags[0] as Tag).click()
    await settle(one)
    expect(one.group.value).toBe('Plum,Apple')
    const internals = internalsOf(one.group)
    expect(internals.ariaMultiSelectable).toBe('true')
  })

  /* Toggle Group and Table write their lists with a bare comma, and the tag
     group wrote ", ". It still reads a list written either way. */
  test('writes its list with a bare comma, and reads one written with spaces', async () => {
    const one = await group('selection-mode="multiple" value="Plum ,  Apple"', FRUIT)
    expect(one.tags.map((tag) => tag.selected)).toEqual([true, false, true])
    cell(one.tags[2] as Tag).click()
    await settle(one)
    expect(one.group.value).toBe('Apple')
    cell(one.tags[2] as Tag).click()
    await settle(one)
    expect(one.group.value).toBe('Apple,Plum')
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

  /* React Aria's tag group extends a selection with Shift and selects every
     tag with Control or Command and A; here a range took a press per tag. */
  test('extends a range with Shift and an arrow, and selects all with Control or Command and A', async () => {
    const one = await group(
      'selection-mode="multiple"',
      '<helix-headless-tag>Apple</helix-headless-tag><helix-headless-tag>Pear</helix-headless-tag><helix-headless-tag disabled>Fig</helix-headless-tag><helix-headless-tag>Plum</helix-headless-tag>',
    )
    const [apple, pear, , plum] = one.tags as [Tag, Tag, Tag, Tag]
    const key = (tag: Tag, init: KeyboardEventInit): void => {
      cell(tag).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, ...init }),
      )
    }
    cell(apple).focus()
    key(apple, { key: ' ' })
    await settle(one)
    expect(one.group.value).toBe('Apple')
    key(apple, { key: 'ArrowRight', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear')
    key(pear, { key: 'ArrowRight', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear,Plum')
    key(plum, { key: 'ArrowLeft', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear')
    key(pear, { key: 'ArrowRight' })
    key(plum, { ctrlKey: true, key: 'a' })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear,Plum')
  })

  /* A press on a remove button is a press on that button, not on the tag. */
  test('does not take a press on the remove button for a selection', async () => {
    const one = await group('selection-mode="multiple"', FRUIT)
    ;(part(one.tags[0] as Tag, 'dismiss') as HTMLElement).click()
    expect(one.group.value).toBe('')
  })
})

/* React Aria's `selectionBehavior="replace"` and `disallowEmptySelection`:
   a file list's selection, and a filter that always keeps one choice. */
describe('selection behavior and an empty selection', () => {
  const PLAIN =
    '<helix-headless-tag>Apple</helix-headless-tag><helix-headless-tag>Pear</helix-headless-tag><helix-headless-tag disabled>Fig</helix-headless-tag><helix-headless-tag>Plum</helix-headless-tag>'
  const key = (tag: Tag, init: KeyboardEventInit): void => {
    cell(tag).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, ...init }),
    )
  }
  const click = (tag: Tag, init: MouseEventInit = {}): void => {
    cell(tag).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...init }),
    )
  }

  /* React Aria's TagGroup clears its selection on Escape, as its GridList does. */
  test('Escape lets go of the selection, asking first, and keeps the key only where it cleared something', async () => {
    const one = await group('selection-mode="multiple" value="Apple, Plum"', PLAIN)
    const [apple] = one.tags as [Tag]
    const asked: string[] = []
    one.group.addEventListener('helix-before-change', (event) =>
      asked.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const pressEscape = (): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      })
      cell(apple).dispatchEvent(event)
      return event
    }
    const first = pressEscape()
    expect([asked, one.group.value, first.defaultPrevented]).toEqual([[''], '', true])
    const again = pressEscape()
    expect([asked.length, again.defaultPrevented]).toEqual([1, false])
  })

  test('and keeps the one selected tag under disallow-empty-selection', async () => {
    const one = await group('selection-mode="single" disallow-empty-selection value="Pear"', PLAIN)
    cell(one.tags[0] as Tag).dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    expect(one.group.value).toBe('Pear')
  })

  test('under replace, a press selects the tag alone, Control adds one, and Shift a range', async () => {
    const one = await group('selection-mode="multiple" selection-behavior="replace"', PLAIN)
    const [apple, pear, , plum] = one.tags as [Tag, Tag, Tag, Tag]
    click(apple)
    click(pear)
    await settle(one)
    expect(one.group.value).toBe('Pear')
    click(plum, { ctrlKey: true })
    await settle(one)
    expect(one.group.value).toBe('Pear,Plum')
    click(apple)
    click(plum, { shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear,Plum')
  })

  /* React Aria's `extendSelection`: a range takes the place of the last one,
     and an arrow without Shift under `toggle` keeps the anchor. */
  test('a Shift range takes the place of the last one, and an arrow alone keeps the anchor', async () => {
    const one = await group('selection-mode="multiple"', PLAIN)
    const [apple, pear, , plum] = one.tags as [Tag, Tag, Tag, Tag]
    click(plum)
    click(apple)
    cell(apple).focus()
    key(apple, { key: 'ArrowRight', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Pear,Plum')
    key(pear, { key: 'ArrowLeft', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Plum')
    // Pear is not where the next range runs from, so it stays let go of.
    key(apple, { key: 'ArrowRight' })
    key(pear, { key: 'ArrowLeft', shiftKey: true })
    await settle(one)
    expect(one.group.value).toBe('Apple,Plum')
  })

  test('under replace, the arrow keys carry the selection, and Control moves without it', async () => {
    const one = await group('selection-mode="multiple" selection-behavior="replace"', PLAIN)
    const [apple, pear, , plum] = one.tags as [Tag, Tag, Tag, Tag]
    cell(apple).focus()
    key(apple, { key: ' ' })
    key(apple, { key: 'ArrowRight' })
    await settle(one)
    expect(one.group.value).toBe('Pear')
    key(pear, { ctrlKey: true, key: 'ArrowRight' })
    await settle(one)
    expect(one.group.value).toBe('Pear')
    key(plum, { ctrlKey: true, key: ' ' })
    await settle(one)
    expect(one.group.value).toBe('Pear,Plum')
  })

  test('under toggle, the default, the arrow keys move focus alone', async () => {
    const one = await group('selection-mode="multiple"', PLAIN)
    const [apple] = one.tags as [Tag]
    cell(apple).focus()
    key(apple, { key: ' ' })
    key(apple, { key: 'ArrowRight' })
    await settle(one)
    expect(one.group.value).toBe('Apple')
  })

  test('disallow-empty-selection refuses a press that would leave none selected', async () => {
    const single = await group(
      'selection-mode="single" disallow-empty-selection value="Apple"',
      PLAIN,
    )
    click(single.tags[0] as Tag)
    await settle(single)
    expect(single.group.value).toBe('Apple')
    click(single.tags[1] as Tag)
    await settle(single)
    expect(single.group.value).toBe('Pear')

    const many = await group(
      'selection-mode="multiple" disallow-empty-selection value="Apple, Pear"',
      PLAIN,
    )
    click(many.tags[0] as Tag)
    await settle(many)
    expect(many.group.value).toBe('Pear')
    click(many.tags[1] as Tag)
    await settle(many)
    expect(many.group.value).toBe('Pear')
  })

  test('and without it, the last selected tag can be let go', async () => {
    const one = await group('selection-mode="single" value="Apple"', PLAIN)
    click(one.tags[0] as Tag)
    await settle(one)
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
    const internals = internalsOf(one.group)
    expect(internals.role).toBe('group')
  })

  /* The core hand-off to the tab stop beside a lone dismissed element took
     focus out of the group first, so the `empty` part was reached only on a
     page with no other stop. happy-dom draws no boxes, so every element is
     given one here for the hand-off to find the buttons. */
  test('as the last one keeps focus in the group between other stops on the page', async () => {
    const rects = HTMLElement.prototype.getClientRects
    HTMLElement.prototype.getClientRects = function (this: HTMLElement) {
      const drawn = rects.call(this)
      return drawn.length > 0 ? drawn : ([{}] as unknown as DOMRectList)
    }
    restore = () => {
      HTMLElement.prototype.getClientRects = rects
    }
    document.body.innerHTML =
      '<button id="before">Before</button><helix-headless-tag-group label="Filters"><helix-headless-tag dismissible>Open</helix-headless-tag><span slot="empty">No filters</span></helix-headless-tag-group><button id="after">After</button>'
    const host = document.querySelector('helix-headless-tag-group') as Group
    await host.updateComplete
    const open = host.querySelector('helix-headless-tag') as Tag
    await open.updateComplete
    host.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    cell(open).focus()
    press(open, 'Backspace')
    await frame()
    await host.updateComplete
    expect(document.activeElement?.localName).toBe('helix-headless-tag-group')
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'empty'))
  })

  /* Focus fell to the body when the last tag that could take it went and a
     disabled tag stayed, and the group was then left with no tab stop. */
  test('where only disabled tags remain keeps focus on one, which holds the stop', async () => {
    const one = await group(
      '',
      '<helix-headless-tag dismissible>Open</helix-headless-tag><helix-headless-tag dismissible disabled>Archived</helix-headless-tag>',
    )
    one.group.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    const [open, archived] = one.tags as [Tag, Tag]
    cell(open).focus()
    press(open, 'Delete')
    await frame()
    await archived.updateComplete
    expect(document.activeElement === archived).toBe(true)
    expect(archived.shadowRoot?.activeElement === cell(archived)).toBe(true)
    expect(cell(archived).getAttribute('tabindex')).toBe('0')
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
    const internals = internalsOf(tag)
    expect([internals.ariaLabel, cell(tag).getAttribute('aria-label')]).toEqual([
      'Status Open',
      'Status Open',
    ])
  })

  test('and a tag on its own is named as it was', async () => {
    await mount('<helix-headless-tag dismissible>Open</helix-headless-tag>')
    const tag = document.querySelector('helix-headless-tag') as Tag
    await tag.updateComplete
    const internals = internalsOf(tag)
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

/* React hands `value={['Apple']}` over as an array, and an emptied group with
   nothing in its `empty` slot said nothing at all. */
describe('a group as a page sets it', () => {
  test('takes an array of values as the written list', async () => {
    const one = await group('selection-mode="multiple"', FRUIT)
    ;(one.group as unknown as { value: string[] }).value = ['Apple', 'Plum']
    await settle(one)
    expect(one.tags.map((tag) => tag.selected)).toEqual([true, false, true])
  })

  test('says `empty-text` once emptied, where nothing is slotted', async () => {
    const one = await group('', '<helix-headless-tag dismissible>Apple</helix-headless-tag>')
    one.group.addEventListener('helix-dismiss', (event) => (event.target as Tag).remove())
    const apple = one.tags[0] as Tag
    cell(apple).focus()
    press(apple, 'Delete')
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await one.group.updateComplete
    const slot = part(one.group, 'empty')?.querySelector('slot')
    expect(slot?.textContent).toBe('No tags')
  })
})

describe('a tag whose definition loads after it was added', () => {
  /* The host hears the definition from `whenDefined`, a microtask after it,
     and both elements then render. */
  const upgraded = async (...elements: Element[]): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      await Promise.all(
        elements.map((one) => (one as Element & { updateComplete?: unknown }).updateComplete),
      )
    }
  }
  test('takes its row role once it upgrades', async () => {
    const group = await mount(
      '<helix-headless-tag-group label="Fruit"><helix-headless-tag>Apple</helix-headless-tag></helix-headless-tag-group>',
    )
    const late = notYetDefined('helix-headless-tag')
    late.element.textContent = 'Pear'
    group.append(late.element)
    await upgraded(group)
    late.define()
    await upgraded(group, late.element)
    expect(role(late.element)).toBe('row')
  })
})

describe('what a sheet can read of a tag in a group', () => {
  test('a tag says with a state while its cell shows keyboard focus, and not after', async () => {
    const one = await group('', FRUIT)
    const [apple, , plum] = one.tags as [Tag, Tag, Tag]
    /* happy-dom does not decide `:focus-visible`, so the cell says it shows a ring. */
    for (const tag of [apple, plum]) {
      Object.defineProperty(cell(tag), 'matches', {
        value: (selector: string): boolean => selector === ':focus-visible',
      })
    }
    cell(apple).focus()
    expect(hasState(apple, 'focus-visible')).toBe(true)
    cell(plum).focus()
    expect(hasState(apple, 'focus-visible')).toBe(false)
    expect(hasState(plum, 'focus-visible')).toBe(true)
  })
})
