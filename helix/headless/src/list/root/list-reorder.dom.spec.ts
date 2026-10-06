import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* A `reorderable` list: a grip on each row, moved by the keys, a click, or a
   pointer, with each step said in the list's live region. The page moves the
   rows, so the specs that move one answer `helix-reorder` as a page would. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

interface List extends Updatable {
  canceledLabel: string
  movedLabel: string
  pickedUpLabel: string
  reorderable: boolean
  rows: Row[]
}

interface Row extends Updatable {
  disabled: boolean
}

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

const lists: List[] = []
afterEach(() => {
  for (const one of lists.splice(0)) {
    one.remove()
  }
})

const settle = async (list: List): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    await list.updateComplete
    await Promise.all(list.rows.map((row) => row.updateComplete))
  }
}

const make = async (extra = '', rows = ''): Promise<List> => {
  const list = (await mount(`<helix-headless-list label="Files" ${extra}>
    ${
      rows ||
      `<helix-headless-list-item value="a">Alpha</helix-headless-list-item>
    <helix-headless-list-item value="b">Beta</helix-headless-list-item>
    <helix-headless-list-item value="c">Gamma</helix-headless-list-item>`
    }
  </helix-headless-list>`)) as List
  lists.push(list)
  await settle(list)
  return list
}

const grip = (row: Row): HTMLButtonElement | null => part(row, 'grip') as HTMLButtonElement | null

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
  })
  target.dispatchEvent(event)
  return event
}

const click = (target: Element): void => {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
}

/* Words land a frame after the region does. */
const spoken = async (list: List): Promise<string> => {
  await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  await list.updateComplete
  return part(list, 'live')?.textContent ?? ''
}

/** Answers each move as a page would, by moving the row elements. */
const follow = (list: List): Detail[] => {
  const heard: Detail[] = []
  list.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    const byKey = new Map(list.rows.map((row) => [row.getAttribute('value'), row]))
    list.append(...detail.keys.map((key) => byKey.get(key) as Row))
  })
  return heard
}

describe('a list that does not reorder', () => {
  test('draws no grip and no live region', async () => {
    const list = await make()
    expect(list.rows.map((row) => grip(row))).toEqual([null, null, null])
    expect(part(list, 'live')).toBeNull()
  })
})

describe('a reorderable list', () => {
  test('gives every row a grip named after it, and none to a disabled row', async () => {
    const list = await make(
      'reorderable',
      `<helix-headless-list-item value="a">Alpha</helix-headless-list-item>
      <helix-headless-list-item value="b" disabled>Beta</helix-headless-list-item>`,
    )
    expect(grip(list.rows[0] as Row)?.getAttribute('aria-label')).toBe('Move Alpha')
    expect(grip(list.rows[0] as Row)?.getAttribute('type')).toBe('button')
    expect(grip(list.rows[1] as Row)).toBeNull()
  })

  test('takes the grips away when reorderable is turned off', async () => {
    const list = await make('reorderable')
    list.reorderable = false
    await settle(list)
    expect(list.rows.map((row) => grip(row))).toEqual([null, null, null])
  })

  test('picks up a row from its grip and says so', async () => {
    const list = await make('reorderable')
    const first = list.rows[0] as Row
    click(grip(first) as Element)
    await settle(list)
    expect(await spoken(list)).toBe('Picked up Alpha')
    expect(part(list, 'live')?.getAttribute('role')).toBe('status')
    expect(hasState(first, 'dragging')).toBe(true)
  })

  test('moves the held row with the arrows, says where, and marks where it lands', async () => {
    const list = await make('reorderable')
    const first = list.rows[0] as Row
    click(grip(first) as Element)
    const down = press(grip(first) as Element, 'ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    await settle(list)
    expect(await spoken(list)).toBe('Alpha moved to position 2 of 3')
    expect(hasState(list.rows[1] as Row, 'drop-after')).toBe(true)
    press(grip(first) as Element, 'End')
    await settle(list)
    expect(hasState(list.rows[1] as Row, 'drop-after')).toBe(false)
    expect(hasState(list.rows[2] as Row, 'drop-after')).toBe(true)
  })

  test('drops it with the grip, asking first, and the page moves the row', async () => {
    const list = await make('reorderable')
    const asked: Detail[] = []
    list.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(list)
    const third = list.rows[2] as Row
    click(grip(third) as Element)
    press(grip(third) as Element, 'Home')
    click(grip(third) as Element)
    await settle(list)
    const detail = { from: 2, key: 'c', keys: ['c', 'a', 'b'], kind: 'item', to: 0, value: 'c,a,b' }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(list.rows.map((row) => row.getAttribute('value'))).toEqual(['c', 'a', 'b'])
    expect(await spoken(list)).toBe('Dropped')
    expect(list.rows.some((row) => hasState(row, 'dragging'))).toBe(false)
  })

  test('a refused move sends no helix-reorder and is said as canceled', async () => {
    const list = await make('reorderable')
    list.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    const heard = follow(list)
    const first = list.rows[0] as Row
    click(grip(first) as Element)
    press(grip(first) as Element, 'ArrowDown')
    click(grip(first) as Element)
    await settle(list)
    expect(heard).toEqual([])
    expect(await spoken(list)).toBe('Canceled')
  })

  test('Escape puts the row back, and keeps the key from what holds the list', async () => {
    const list = await make('reorderable')
    const heard = follow(list)
    const first = list.rows[0] as Row
    click(grip(first) as Element)
    press(grip(first) as Element, 'ArrowDown')
    const esc = press(grip(first) as Element, 'Escape')
    await settle(list)
    expect(esc.defaultPrevented).toBe(true)
    expect(heard).toEqual([])
    expect(await spoken(list)).toBe('Canceled')
    expect(list.rows.some((row) => hasState(row, 'drop-after'))).toBe(false)
  })

  test('a click on another row drops the held one there, and selects nothing', async () => {
    const list = await make('reorderable selection-mode="single"')
    const heard = follow(list)
    const first = list.rows[0] as Row
    click(grip(first) as Element)
    click(part(list.rows[2] as Row, 'row') as Element)
    await settle(list)
    expect(heard.map((one) => one.keys)).toEqual([['b', 'c', 'a']])
    expect((list as unknown as { value: string }).value).toBe('')
  })

  test('in a list that selects, the grip is reached with the arrows and out of the tab order', async () => {
    const list = await make('reorderable selection-mode="multiple"')
    const first = list.rows[0] as Row
    expect(grip(first)?.getAttribute('tabindex')).toBe('-1')
    ;(part(first, 'row') as HTMLElement).focus()
    press(part(first, 'row') as Element, 'ArrowRight')
    expect(first.shadowRoot?.activeElement).toBe(grip(first))
  })

  test('the words are the page’s to change', async () => {
    const list = await make('reorderable picked-up-label="Holding {name}"')
    click(grip(list.rows[1] as Row) as Element)
    await settle(list)
    expect(await spoken(list)).toBe('Holding Beta')
  })
})
