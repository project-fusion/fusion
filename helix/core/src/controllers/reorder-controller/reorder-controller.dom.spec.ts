import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ReorderDetail } from '../../events/details.js'
import type { ReorderMove, ReorderOptions } from './reorder-controller.js'

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
const controllers: ReactiveController[] = []
/* A drag a spec leaves held keeps its listeners on the window, the capture-phase
   Escape among them, which would keep that key from every later spec. */
afterEach(() => {
  for (const one of controllers.splice(0)) {
    one.hostDisconnected?.()
  }
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
/* Options a spec sets or takes away, `undefined` included. */
type More = { [Option in keyof ReorderOptions]?: ReorderOptions[Option] | undefined }

const setup = (refuse = false, more: More = {}) => {
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
    ...(more as Partial<ReorderOptions>),
  })
  controller?.hostConnected?.()
  if (controller) {
    controllers.push(controller)
  }
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

describe('Alt with an arrow', () => {
  /* The item a key stands for is the one with focus, here the row the key was
     pressed in. */
  const current = (event: KeyboardEvent): string | undefined =>
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && 'key' in node.dataset)
      ?.dataset.key

  test('moves the item a key stands for a place at once, and says where it went', () => {
    const { drops, reorder, rows, said } = setup(false, { current })
    const down = key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(down.defaultPrevented).toBe(true)
    expect(drops).toEqual([{ from: 0, key: 'a', to: 1 }])
    expect(said).toEqual(['A moved to position 2 of 3'])
    expect(reorder.held).toBeUndefined()
    key(rows[2] as Element, 'Home', { altKey: true })
    expect(drops.at(-1)).toEqual({ from: 2, key: 'c', to: 0 })
  })

  test('keeps the key at an end and moves nothing', () => {
    const { drops, rows, said } = setup(false, { current })
    const up = key(rows[0] as Element, 'ArrowUp', { altKey: true })
    expect(up.defaultPrevented).toBe(true)
    expect(drops).toEqual([])
    expect(said).toEqual([])
  })

  test('a refused move is said as canceled', () => {
    const { rows, said } = setup(true, { current })
    key(rows[1] as Element, 'ArrowDown', { altKey: true })
    expect(said).toEqual(['Canceled'])
  })

  test('leaves the key alone without current, with Shift, and while disabled', () => {
    const plain = setup()
    expect(key(plain.rows[0] as Element, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(
      false,
    )
    const shifted = setup(false, { current })
    expect(
      key(shifted.rows[0] as Element, 'ArrowDown', { altKey: true, shiftKey: true })
        .defaultPrevented,
    ).toBe(false)
    const off = setup(false, { current, enabled: () => false })
    expect(key(off.rows[0] as Element, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(false)
    expect([...plain.drops, ...shifted.drops, ...off.drops]).toEqual([])
  })

  test('moves an item among the keys asked for it, as a tree moves one among its siblings', () => {
    const asked: string[] = []
    const { drops, rows, said } = setup(false, {
      current,
      keys: (one) => {
        asked.push(one)
        return ['b', 'c']
      },
    })
    key(rows[1] as Element, 'ArrowDown', { altKey: true })
    expect(asked.every((one) => one === 'b')).toBe(true)
    expect(drops).toEqual([{ from: 0, key: 'b', to: 1 }])
    expect(said).toEqual(['B moved to position 2 of 2'])
  })
})

describe('what a host leaves to the controller', () => {
  const current = (event: KeyboardEvent): string | undefined =>
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && 'key' in node.dataset)
      ?.dataset.key

  test('without drop, it asks the page itself, and a key a filter hides keeps its place', () => {
    const { rows } = setup(false, { all: () => ['a', 'x', 'b', 'c'], current, drop: undefined })
    const host = rows[0]?.parentElement as HTMLElement
    const heard: unknown[] = []
    host.addEventListener('helix-before-reorder', (event) => heard.push(event.type))
    host.addEventListener('helix-reorder', (event) => heard.push(event.detail))
    key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(heard).toEqual([
      'helix-before-reorder',
      { from: 0, key: 'a', keys: ['x', 'b', 'a', 'c'], kind: 'item', to: 2, value: 'x,b,a,c' },
    ])
  })

  test('without enabled, it reads the host’s reorderable', () => {
    const { drops, rows } = setup(false, { current })
    const host = rows[0]?.parentElement as HTMLElement & { reorderable?: boolean }
    host.reorderable = false
    key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(drops).toEqual([])
    host.reorderable = true
    key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(drops).toHaveLength(1)
  })

  test('without words, it reads the host’s own labels', () => {
    const { rows, said } = setup(false, { current, words: undefined })
    Object.assign(rows[0]?.parentElement as HTMLElement, {
      canceledLabel: 'No',
      droppedLabel: 'Down',
      movedLabel: '{name} at {position}',
      pickedUpLabel: 'Up',
    })
    key(rows[1] as Element, 'ArrowUp', { altKey: true })
    expect(said).toEqual(['B at 1'])
  })

  test('without say, it writes the words to the host’s announced, where it has one', () => {
    const { rows } = setup(false, { current, say: undefined })
    const host = rows[0]?.parentElement as HTMLElement & { announced?: string }
    key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(host.announced).toBeUndefined()
    host.announced = ''
    key(rows[0] as Element, 'ArrowDown', { altKey: true })
    expect(host.announced).toBe('A moved to position 2 of 3')
  })

  test('gives focus back to the moved item where the page’s move sent it to the body', () => {
    const refocused: string[] = []
    let page = (): void => {}
    const { grips, rows } = setup(false, {
      current,
      drop: () => {
        page()
        return true
      },
      refocus: (one) => {
        refocused.push(one)
        grips[1]?.focus()
      },
    })
    page = () => rows[0]?.parentElement?.append(rows[0] as Element)
    ;(grips[0] as HTMLElement).focus()
    key(grips[0] as Element, 'ArrowDown', { altKey: true })
    expect(refocused).toEqual(['a'])
  })

  test('a click on an item the held one does not move among drops nothing', () => {
    const { drops, grips, rows } = setup(false, { keys: () => ['a', 'b'] })
    click(grips[0] as Element)
    const there = click(rows[2] as Element)
    expect(there.defaultPrevented).toBe(false)
    expect(drops).toEqual([])
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

describe('the drag preview', () => {
  /* A host with a shadow root that draws the part, as a Lit host's template
     does, and rows with words in them, whose copy the preview draws. */
  const withPreview = (more: More = {}, part = true) => {
    const made = setup(false, {
      preview: (key) => made.rows[['a', 'b', 'c'].indexOf(key)],
      ...more,
    })
    const host = made.rows[0]?.parentElement as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    if (part) {
      const drawn = document.createElement('div')
      drawn.setAttribute('part', 'drag-preview')
      root.append(drawn)
    }
    for (const [index, row] of made.rows.entries()) {
      row.append(['Alpha', 'Beta', 'Gamma'][index] as string)
    }
    const preview = (): HTMLElement | null => root.querySelector('[part="drag-preview"]')
    return { ...made, host, preview, root }
  }

  const pressEscape = (): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    window.dispatchEvent(event)
    return event
  }

  test('a pointer drag draws a copy of the item in the part the host draws, where the item is', () => {
    const { grips, host, preview, rows } = withPreview()
    pointer(grips[1] as Element, 'pointerdown', 30)
    pointer(window, 'pointermove', 31)
    expect(preview()?.childElementCount).toBe(0)
    pointer(window, 'pointermove', 40)
    const drawn = preview() as HTMLElement
    expect(drawn.textContent).toBe('Beta')
    expect(drawn.querySelector('button')).not.toBeNull()
    /* The row's box, 20 pixels down, and nothing written on the page. */
    expect([drawn.style.top, drawn.style.width, drawn.style.height]).toEqual([
      '20px',
      '100px',
      '20px',
    ])
    expect(host.querySelectorAll('[part="drag-preview"]').length).toBe(0)
    expect(rows[1]?.childElementCount).toBe(1)
  })

  test('the part a template draws is a closed manual popover, out of the accessibility tree, while items may be moved', () => {
    let on = true
    const { reorder } = withPreview({ enabled: () => on })
    const markup = (): string =>
      (reorder.drawDragPreview() as { strings?: readonly string[] }).strings?.join('') ?? ''
    expect(markup()).toBe(
      '<div part="drag-preview" popover="manual" aria-hidden="true" inert></div>',
    )
    on = false
    expect(markup()).toBe('')
  })

  test('a host that draws no part draws no preview', () => {
    const { grips, reorder, root } = withPreview({}, false)
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    expect(reorder.held?.by).toBe('pointer')
    expect(root.childElementCount).toBe(0)
  })

  test('follows the pointer from where it went down', () => {
    const { grips, preview } = withPreview()
    pointer(grips[1] as Element, 'pointerdown', 30)
    pointer(window, 'pointermove', 40)
    expect(preview()?.style.getPropertyValue('translate')).toBe('0px 10px')
    pointer(window, 'pointermove', 52)
    expect(preview()?.style.getPropertyValue('translate')).toBe('0px 22px')
  })

  test('is emptied after the drop', () => {
    const { drops, grips, preview } = withPreview()
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    pointer(window, 'pointerup', 55)
    expect(drops).toEqual([{ from: 0, key: 'a', to: 2 }])
    expect(preview()?.childElementCount ?? 0).toBe(0)
  })

  test('Escape puts the item back, takes the preview away, and keeps the key from the page', () => {
    const { drops, grips, preview, reorder, said } = withPreview()
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    const event = pressEscape()
    expect(event.defaultPrevented).toBe(true)
    expect(preview()?.childElementCount ?? 0).toBe(0)
    expect(reorder.held).toBeUndefined()
    expect(said).toEqual(['Canceled'])
    /* The click the release raises on the grip does not take hold again. */
    pointer(window, 'pointerup', 55)
    click(grips[0] as Element)
    pointer(window, 'pointerup', 55)
    expect(reorder.held).toBeUndefined()
    expect(drops).toEqual([])
  })

  test('a canceled pointer takes it away', () => {
    const { grips, preview } = withPreview()
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    pointer(window, 'pointercancel', 55)
    expect(preview()?.childElementCount ?? 0).toBe(0)
  })

  test('a move made with the keys draws none', () => {
    const { grips, preview, reorder } = withPreview()
    click(grips[0] as Element)
    key(grips[0] as Element, 'ArrowDown')
    expect(reorder.held?.to).toBe(1)
    expect(preview()?.childElementCount ?? 0).toBe(0)
  })

  test('a host that names no element to copy draws none', () => {
    const { grips, preview, reorder } = withPreview({ preview: undefined })
    pointer(grips[0] as Element, 'pointerdown', 10)
    pointer(window, 'pointermove', 55)
    expect(reorder.held?.by).toBe('pointer')
    expect(preview()?.childElementCount ?? 0).toBe(0)
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
