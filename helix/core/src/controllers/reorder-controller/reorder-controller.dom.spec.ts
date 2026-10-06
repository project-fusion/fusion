import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ReorderDetail } from '../../events/details.js'
import type { ReorderMove } from './reorder-controller.js'

type Module = typeof import('./reorder-controller.js')

let ReorderController: Module['ReorderController']
let requestReorder: Module['requestReorder']

/* Imported after registration, because the event classes capture whichever
   `Event` is global when their module is evaluated, as `events.pure.spec.ts`
   says. */
beforeAll(async () => {
  registerDom()
  ;({ ReorderController, requestReorder } = await import('./reorder-controller.js'))
})

const hosts: HTMLElement[] = []
afterEach(() => {
  for (const one of hosts.splice(0)) {
    one.remove()
  }
})

const WORDS = {
  canceled: 'Canceled',
  dropped: 'Dropped',
  moved: '{name} moved to position {position} of {count}',
  pickedUp: 'Picked up {name}',
}

/* Three rows, each a button grip in a row 20 pixels tall, in a host with the
   one hook the controller asks of a Lit host. */
const setup = (refuse = false) => {
  const host = document.createElement('div') as unknown as HTMLElement & ReactiveControllerHost
  const keys = ['a', 'b', 'c']
  const rows = keys.map((key, index) => {
    const row = document.createElement('div')
    row.dataset.key = key
    const grip = document.createElement('button')
    grip.dataset.grip = key
    row.append(grip)
    row.getBoundingClientRect = () => new DOMRect(0, index * 20, 100, 20)
    return row
  })
  host.append(...rows)
  document.body.append(host)
  hosts.push(host)
  let controller: ReactiveController | undefined
  ;(host as unknown as { addController: (one: ReactiveController) => void }).addController = (
    one,
  ) => {
    controller = one
  }
  let updates = 0
  ;(host as unknown as { requestUpdate: () => void }).requestUpdate = () => {
    updates += 1
  }
  const said: string[] = []
  const drops: ReorderMove[] = []
  const reorder = new ReorderController(host, {
    axis: 'block',
    box: (key) => rows[keys.indexOf(key)]?.getBoundingClientRect(),
    drop: (move) => {
      drops.push(move)
      return !refuse
    },
    grip: (event) => {
      const element = event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && 'grip' in node.dataset)
      return element ? { element, key: element.dataset.grip ?? '' } : undefined
    },
    item: (event) =>
      event
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && 'key' in node.dataset)
        ?.dataset.key,
    keys: () => keys,
    name: (key) => key.toUpperCase(),
    say: (words) => said.push(words),
    words: () => WORDS,
  })
  controller?.hostConnected?.()
  const grips = rows.map((row) => row.querySelector('button') as HTMLButtonElement)
  return { drops, grips, reorder, rows, said, updates: () => updates }
}

const key = (target: Element, name: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: name,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

const click = (target: Element, at?: { x: number; y: number }): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: at?.x ?? 0,
    clientY: at?.y ?? 0,
    composed: true,
    detail: at ? 1 : 0,
  })
  target.dispatchEvent(event)
  return event
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

describe('a key or a click on a grip', () => {
  test('takes hold of the item and says so', () => {
    const { grips, reorder, said } = setup()
    click(grips[1] as Element)
    expect(reorder.held).toEqual({ by: 'keyboard', from: 1, key: 'b', to: 1 })
    expect(said).toEqual(['Picked up B'])
  })

  test('the arrows move it, saying where it is, and the drop indicator follows', () => {
    const { grips, reorder, said } = setup()
    click(grips[0] as Element)
    const down = key(grips[0] as Element, 'ArrowDown')
    expect(down.defaultPrevented).toBe(true)
    expect(reorder.mark).toEqual({ edge: 'after', key: 'b' })
    key(grips[0] as Element, 'End')
    expect(reorder.held?.to).toBe(2)
    expect(said).toEqual([
      'Picked up A',
      'A moved to position 2 of 3',
      'A moved to position 3 of 3',
    ])
  })

  test('a second click on the grip drops it, and the drop is asked for once', () => {
    const { drops, grips, reorder, said } = setup()
    click(grips[2] as Element)
    key(grips[2] as Element, 'ArrowUp')
    key(grips[2] as Element, 'ArrowUp')
    click(grips[2] as Element)
    expect(drops).toEqual([{ from: 2, key: 'c', to: 0 }])
    expect(reorder.held).toBeUndefined()
    expect(said.at(-1)).toBe('Dropped')
  })

  test('Escape puts it back and asks for nothing', () => {
    const { drops, grips, reorder, said } = setup()
    click(grips[0] as Element)
    key(grips[0] as Element, 'ArrowDown')
    const esc = key(grips[0] as Element, 'Escape')
    expect(esc.defaultPrevented).toBe(true)
    expect(drops).toEqual([])
    expect(reorder.held).toBeUndefined()
    expect(said.at(-1)).toBe('Canceled')
  })

  test('a refused drop is said as canceled', () => {
    const { grips, said } = setup(true)
    click(grips[0] as Element)
    key(grips[0] as Element, 'ArrowDown')
    click(grips[0] as Element)
    expect(said.at(-1)).toBe('Canceled')
  })

  test('a click on another item drops the held one there', () => {
    const { drops, grips, rows } = setup()
    click(grips[0] as Element)
    const there = click(rows[2] as Element)
    expect(there.defaultPrevented).toBe(true)
    expect(drops).toEqual([{ from: 0, key: 'a', to: 2 }])
  })

  test('a pointer click on another item drops it by the half it lands in', () => {
    const { drops, grips, rows } = setup()
    click(grips[2] as Element)
    /* The top half of row b, 20 to 40: the held row goes before it. */
    click(rows[1] as Element, { x: 5, y: 24 })
    expect(drops).toEqual([{ from: 2, key: 'c', to: 1 }])
  })

  test('the arrows do nothing while nothing is held', () => {
    const { grips, reorder } = setup()
    const down = key(grips[0] as Element, 'ArrowDown')
    expect(down.defaultPrevented).toBe(false)
    expect(reorder.held).toBeUndefined()
  })
})

describe('a pointer dragging a grip', () => {
  test('holds the item once it travels, places it under the pointer, and drops it on release', () => {
    const { drops, grips, reorder } = setup()
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 12)
    expect(reorder.held).toBeUndefined()
    pointer(window, 'pointermove', 55)
    expect(reorder.held).toEqual({ by: 'pointer', from: 0, key: 'a', to: 2 })
    expect(reorder.mark).toEqual({ edge: 'after', key: 'c' })
    pointer(window, 'pointerup', 55)
    expect(drops).toEqual([{ from: 0, key: 'a', to: 2 }])
    expect(reorder.held).toBeUndefined()
  })

  test('a press that does not travel moves nothing', () => {
    const { drops, grips, reorder } = setup()
    pointer(grips[1] as Element, 'pointerdown', 30)
    pointer(window, 'pointerup', 30)
    expect(drops).toEqual([])
    expect(reorder.held).toBeUndefined()
  })

  test('a canceled pointer puts the item back', () => {
    const { drops, grips, reorder } = setup()
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    pointer(window, 'pointercancel', 55)
    expect(drops).toEqual([])
    expect(reorder.held).toBeUndefined()
  })
})

describe('asking for a move', () => {
  const detail: ReorderDetail = {
    from: 0,
    key: 'a',
    keys: ['b', 'a'],
    kind: 'item',
    to: 1,
    value: 'b,a',
  }

  test('sends helix-before-reorder, then helix-reorder', () => {
    const host = document.createElement('div')
    const heard: string[] = []
    host.addEventListener('helix-before-reorder', (event) => heard.push(event.type))
    host.addEventListener('helix-reorder', (event) => {
      heard.push(event.type)
      expect(event.detail).toEqual(detail)
    })
    expect(requestReorder(host, detail)).toBe(true)
    expect(heard).toEqual(['helix-before-reorder', 'helix-reorder'])
  })

  test('stops at a refused helix-before-reorder', () => {
    const host = document.createElement('div')
    const heard: string[] = []
    host.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    host.addEventListener('helix-reorder', (event) => heard.push(event.type))
    expect(requestReorder(host, detail)).toBe(false)
    expect(heard).toEqual([])
  })
})
