import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A `reorderable` virtual list with the reorder entry imported: Alt with an
   arrow moves the row the keys are on, and a pointer drags a whole row. The
   page moves the items, so the specs answer `helix-reorder` as a page would,
   by setting `items` in the new order. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('./index.js')
})

type List = Updatable & {
  canceledLabel: string
  columns: number
  items: unknown[] | undefined
  movedLabel: string
  reorderable: boolean
}

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

afterEach(() => {
  document.body.replaceChildren()
})

const ITEMS = ['Alpha', 'Beta', 'Gamma', 'Delta'].map((name) => ({
  id: name[0]?.toLowerCase(),
  name,
}))

const make = async (extra = 'reorderable'): Promise<List> => {
  document.body.innerHTML = `<helix-headless-virtual-list label="Order" key-field="id" ${extra}><template><div><span data-field="name"></span></div></template></helix-headless-virtual-list>`
  const list = document.body.firstElementChild as List
  list.items = ITEMS
  await settle(list)
  await settle(list)
  return list
}

const rows = (list: HTMLElement): HTMLElement[] => [
  ...list.querySelectorAll<HTMLElement>(':scope > [data-index]'),
]

const order = (list: List): string[] => (list.items as { id: string }[]).map((item) => item.id)

/** Answers each move as a page would, by setting `items` in the new order. */
const follow = (list: List): Detail[] => {
  const heard: Detail[] = []
  list.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    const byKey = new Map((list.items as { id: string }[]).map((item) => [item.id, item]))
    list.items = detail.keys.map((key) => byKey.get(key))
  })
  return heard
}

const press = (on: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  })
  on.dispatchEvent(event)
  return event
}

const spoken = (list: HTMLElement): string =>
  list.shadowRoot?.querySelector('[data-reorder-live]')?.textContent?.trim() ?? ''

const tick = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('a reorderable virtual list', () => {
  test('Alt with Down moves the row the keys are on a place, asking first, and the keys stay on it', async () => {
    const list = await make()
    const asked: Detail[] = []
    list.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(list)
    const alpha = rows(list)[0] as HTMLElement
    alpha.focus()
    await settle(list)
    const down = press(alpha, 'ArrowDown', { altKey: true })
    expect(down.defaultPrevented).toBe(true)
    const detail = {
      from: 0,
      key: 'a',
      keys: ['b', 'a', 'g', 'd'],
      kind: 'item',
      to: 1,
      value: 'b,a,g,d',
    }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(order(list)).toEqual(['b', 'a', 'g', 'd'])
    expect(spoken(list)).toBe('Alpha moved to position 2 of 4')
    await settle(list)
    await tick()
    await settle(list)
    expect((document.activeElement as HTMLElement).textContent?.trim()).toBe('Alpha')
    expect((document.activeElement as HTMLElement).dataset.index).toBe('1')
  })

  test('Alt with End moves it to the end, and a refused move is said as canceled', async () => {
    const list = await make()
    follow(list)
    const alpha = rows(list)[0] as HTMLElement
    alpha.focus()
    await settle(list)
    press(alpha, 'End', { altKey: true })
    expect(order(list)).toEqual(['b', 'g', 'd', 'a'])
    list.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    await settle(list)
    await tick()
    await settle(list)
    press(document.activeElement as HTMLElement, 'Home', { altKey: true })
    expect(order(list)).toEqual(['b', 'g', 'd', 'a'])
    expect(spoken(list)).toBe('Canceled')
  })

  /* The far end of a long set is not drawn, and the item is followed there. */
  test('Alt with End moves an item past every undrawn row, and the keys follow it there', async () => {
    const list = await make()
    list.items = Array.from({ length: 500 }, (_, at) => ({ id: `k${at}`, name: `Row ${at}` }))
    await settle(list)
    follow(list)
    const first = rows(list)[0] as HTMLElement
    first.focus()
    await settle(list)
    press(first, 'End', { altKey: true })
    expect(order(list).at(-1)).toBe('k0')
    await settle(list)
    await tick()
    await settle(list)
    await settle(list)
    expect((document.activeElement as HTMLElement).dataset.index).toBe('499')
    expect((document.activeElement as HTMLElement).textContent?.trim()).toBe('Row 0')
  })

  test('a pointer drags a whole row, marks where it lands, and drops it there', async () => {
    const list = await make()
    const heard = follow(list)
    for (const [index, row] of rows(list).entries()) {
      row.getBoundingClientRect = () => new DOMRect(0, index * 20, 100, 20)
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
    pointer(rows(list)[2] as HTMLElement, 'pointerdown', 50)
    pointer(window, 'pointermove', 30)
    pointer(window, 'pointermove', 4)
    await settle(list)
    await settle(list)
    expect(rows(list)[2]?.hasAttribute('data-dragging')).toBe(true)
    expect(rows(list)[0]?.hasAttribute('data-drop-before')).toBe(true)
    expect(part(list, 'drag-preview')?.getAttribute('aria-hidden')).toBe('true')
    pointer(window, 'pointerup', 4)
    await settle(list)
    await settle(list)
    expect(heard.map((one) => one.keys)).toEqual([['g', 'a', 'b', 'd']])
    expect(rows(list).some((one) => one.hasAttribute('data-dragging'))).toBe(false)
    expect(rows(list).some((one) => one.hasAttribute('data-drop-before'))).toBe(false)
  })

  test('the words are the page’s to change, by attribute or by property', async () => {
    const list = await make('reorderable moved-label="{name} is now {position}"')
    follow(list)
    const alpha = rows(list)[0] as HTMLElement
    alpha.focus()
    press(alpha, 'ArrowDown', { altKey: true })
    expect(spoken(list)).toBe('Alpha is now 2')
    list.canceledLabel = 'Kept'
    expect(list.getAttribute('canceled-label')).toBe('Kept')
  })
})

describe('a virtual list that does not move its items', () => {
  test('without reorderable, or in a grid, Alt with Down moves nothing', async () => {
    for (const extra of ['', 'reorderable columns="2"']) {
      const list = await make(extra)
      const heard = follow(list)
      const alpha = rows(list)[0] as HTMLElement
      alpha.focus()
      await settle(list)
      press(alpha, 'ArrowDown', { altKey: true })
      expect(heard).toEqual([])
      expect(order(list)).toEqual(['a', 'b', 'g', 'd'])
      expect(list.shadowRoot?.querySelector('[data-reorder-live]')).toBeNull()
    }
  })
})
