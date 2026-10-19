import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasState,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* A `reorderable` listbox with the reorder entry imported: Alt with an arrow
   moves the highlighted option at once, and a pointer drags a whole option.
   Each move is said in the list's live region. The page moves the options, so
   the specs that move one answer `helix-reorder` as a page would. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
  await import('./index.js')
})

type Listbox = Updatable & {
  canceledLabel: string
  filter: string
  highlight(where: 'first' | 'last' | 'none' | 'selected'): void
  items: unknown[] | undefined
  movedLabel: string
  reorderable: boolean
  value: string
}

type Option = HTMLElement & { active: boolean; disabled: boolean; value: string }

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

const lists: Listbox[] = []
afterEach(() => {
  for (const one of lists.splice(0)) {
    one.remove()
  }
})

const OPTIONS = `<helix-headless-option value="a">Alpha</helix-headless-option>
  <helix-headless-option value="b">Beta</helix-headless-option>
  <helix-headless-option value="c">Gamma</helix-headless-option>`

const make = async (extra = 'reorderable', options = OPTIONS): Promise<Listbox> => {
  const list = (await mount(
    `<helix-headless-listbox label="Order" ${extra}>${options}</helix-headless-listbox>`,
  )) as Listbox
  lists.push(list)
  await settle(list)
  return list
}

/* The options the list holds, as the page wrote them, groups included. */
const optionsOf = (list: HTMLElement): Option[] => [
  ...list.querySelectorAll<Option>('helix-headless-option'),
]

const order = (list: HTMLElement): string[] => optionsOf(list).map((one) => one.value)

const press = (list: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  })
  ;(part(list, 'items') as HTMLElement).dispatchEvent(event)
  return event
}

const spoken = async (list: Listbox): Promise<string> => {
  await settle(list)
  return part(list, 'live')?.textContent?.trim() ?? ''
}

/** Answers each move as a page would: moves the options, or sets `items`. */
const follow = (list: Listbox): Detail[] => {
  const heard: Detail[] = []
  list.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    if (list.items) {
      list.items = detail.keys
      return
    }
    const moved = optionsOf(list).find((one) => one.value === detail.key) as Option
    const parent = moved.parentElement as HTMLElement
    for (const key of detail.keys) {
      parent.append(optionsOf(list).find((one) => one.value === key) as Option)
    }
  })
  return heard
}

/** Puts the highlight on the option with that value, as the arrows would. */
const highlight = async (list: Listbox, value: string): Promise<void> => {
  list.highlight('first')
  await settle(list)
  while (optionsOf(list).find((one) => one.active)?.value !== value) {
    press(list, 'ArrowDown')
    await settle(list)
  }
}

describe('a reorderable listbox', () => {
  test('Alt with Down moves the highlighted option a place, asking first, and keeps the highlight', async () => {
    const list = await make('reorderable manual')
    const asked: Detail[] = []
    list.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(list)
    await highlight(list, 'a')
    const down = press(list, 'ArrowDown', { altKey: true })
    expect(down.defaultPrevented).toBe(true)
    const detail = { from: 0, key: 'a', keys: ['b', 'a', 'c'], kind: 'item', to: 1, value: 'b,a,c' }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(order(list)).toEqual(['b', 'a', 'c'])
    expect(await spoken(list)).toBe('Alpha moved to position 2 of 3')
    expect(optionsOf(list).find((one) => one.active)?.value).toBe('a')
    expect(list.value).toBe('')
  })

  test('Alt with End and Home move it to either end', async () => {
    const list = await make('reorderable manual')
    const heard = follow(list)
    await highlight(list, 'b')
    press(list, 'End', { altKey: true })
    press(list, 'Home', { altKey: true })
    expect(heard.map((one) => one.keys)).toEqual([
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
    ])
  })

  test('a refused move is said as canceled, and nothing moves', async () => {
    const list = await make('reorderable manual')
    list.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    const heard = follow(list)
    await highlight(list, 'c')
    press(list, 'ArrowUp', { altKey: true })
    expect(heard).toEqual([])
    expect(order(list)).toEqual(['a', 'b', 'c'])
    expect(await spoken(list)).toBe('Canceled')
  })

  test('moves an option within its group', async () => {
    const list = await make(
      'reorderable manual',
      `<helix-headless-option-group label="Fruit">
        <helix-headless-option value="apple">Apple</helix-headless-option>
        <helix-headless-option value="pear">Pear</helix-headless-option>
      </helix-headless-option-group>
      <helix-headless-option-group label="Roots">
        <helix-headless-option value="beet">Beet</helix-headless-option>
        <helix-headless-option value="leek">Leek</helix-headless-option>
      </helix-headless-option-group>`,
    )
    const heard = follow(list)
    await highlight(list, 'pear')
    press(list, 'ArrowDown', { altKey: true })
    press(list, 'ArrowUp', { altKey: true })
    expect(heard.map((one) => one.keys)).toEqual([['pear', 'apple']])
  })

  test('moves a record of items, and the page sets items in the new order', async () => {
    const list = (await mount(
      '<helix-headless-listbox label="Order" reorderable manual></helix-headless-listbox>',
    )) as Listbox
    lists.push(list)
    list.items = ['one', 'two', { label: 'Three', value: 3 }]
    await settle(list)
    await settle(list)
    const heard = follow(list)
    list.highlight('last')
    await settle(list)
    press(list, 'Home', { altKey: true })
    await settle(list)
    expect(heard.map((one) => one.keys)).toEqual([['3', 'one', 'two']])
    expect(list.items).toEqual(['3', 'one', 'two'])
    expect(await spoken(list)).toBe('Three moved to position 1 of 3')
  })

  test('the words are the page’s to change, by attribute or by property', async () => {
    const list = await make('reorderable manual moved-label="{name} is now {position} of {count}"')
    follow(list)
    expect(list.canceledLabel).toBe('Canceled')
    list.canceledLabel = 'Not moved'
    expect(list.getAttribute('canceled-label')).toBe('Not moved')
    await highlight(list, 'a')
    press(list, 'ArrowDown', { altKey: true })
    expect(await spoken(list)).toBe('Alpha is now 2 of 3')
  })

  test('a pointer drags a whole option, marks where it lands, and drops it there', async () => {
    const list = await make('reorderable manual')
    const heard = follow(list)
    const options = optionsOf(list)
    for (const [index, option] of options.entries()) {
      option.getBoundingClientRect = () => new DOMRect(0, index * 20, 100, 20)
    }
    const pointer = (target: EventTarget, type: string, y: number): void => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          clientX: 5,
          clientY: y,
          composed: true,
          pointerId: 1,
        }),
      )
    }
    pointer(options[2] as Option, 'pointerdown', 50)
    pointer(window, 'pointermove', 30)
    pointer(window, 'pointermove', 4)
    await settle(list)
    await settle(list)
    expect(hasState(options[2] as Option, 'dragging')).toBe(true)
    expect(hasState(options[0] as Option, 'drop-before')).toBe(true)
    pointer(window, 'pointerup', 4)
    await settle(list)
    await settle(list)
    expect(heard.map((one) => one.keys)).toEqual([['c', 'a', 'b']])
    expect(optionsOf(list).some((one) => hasState(one, 'dragging'))).toBe(false)
    expect(optionsOf(list).some((one) => hasState(one, 'drop-before'))).toBe(false)
  })
})

describe('a pointer dragging an option', () => {
  const pointer = (target: EventTarget, type: string, y: number): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: 5,
        clientY: y,
        composed: true,
        pointerId: 1,
      }),
    )
  }

  test('draws a copy of it in the list’s drag-preview part, hidden from assistive technology, which follows the pointer until the drop', async () => {
    const list = await make('reorderable manual')
    follow(list)
    const beta = optionsOf(list)[1] as Option
    pointer(beta, 'pointerdown', 5)
    pointer(window, 'pointermove', 25)
    const preview = part(list, 'drag-preview') as HTMLElement
    expect(preview.getAttribute('aria-hidden')).toBe('true')
    expect(preview.textContent).toContain('Beta')
    expect(preview.style.getPropertyValue('translate')).toBe('0px 20px')
    pointer(window, 'pointerup', 25)
    expect(part(list, 'drag-preview')?.childElementCount ?? 0).toBe(0)
  })

  test('Escape takes the copy away, and Alt with an arrow draws none', async () => {
    const list = await make('reorderable manual')
    follow(list)
    pointer(optionsOf(list)[1] as Option, 'pointerdown', 5)
    pointer(window, 'pointermove', 25)
    window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, key: 'Escape' }))
    expect(part(list, 'drag-preview')?.childElementCount ?? 0).toBe(0)
    pointer(window, 'pointerup', 25)
    await highlight(list, 'a')
    press(list, 'ArrowDown', { altKey: true })
    await settle(list)
    expect(order(list)).toEqual(['b', 'a', 'c'])
    expect(part(list, 'drag-preview')?.childElementCount ?? 0).toBe(0)
  })
})

describe('a listbox that does not move its options', () => {
  test('without reorderable, Alt with Down moves nothing', async () => {
    const list = await make('manual')
    const heard = follow(list)
    await highlight(list, 'a')
    press(list, 'ArrowDown', { altKey: true })
    expect(heard).toEqual([])
  })

  test('nor while a filter narrows the list, or in a grid', async () => {
    const filtered = await make('reorderable manual filterable default-filter="a"')
    const grid = await make('reorderable manual layout="grid"')
    const heard = [...follow(filtered), ...follow(grid)]
    for (const list of [filtered, grid]) {
      list.highlight('first')
      await settle(list)
      press(list, 'ArrowDown', { altKey: true })
    }
    expect(heard).toEqual([])
  })

  test('nor a disabled option', async () => {
    const list = await make(
      'reorderable manual',
      `<helix-headless-option value="a" disabled>Alpha</helix-headless-option>
      <helix-headless-option value="b">Beta</helix-headless-option>`,
    )
    const heard = follow(list)
    const [alpha] = optionsOf(list) as [Option]
    alpha.active = true
    press(list, 'ArrowDown', { altKey: true })
    expect(heard).toEqual([])
  })
})
