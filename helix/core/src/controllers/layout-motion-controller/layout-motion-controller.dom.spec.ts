import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { LayoutMotionController } from './layout-motion-controller.js'

beforeAll(() => {
  registerDom()
})

/** The height of a row, laid out in a column. happy-dom lays out nothing, so the rows are placed here. */
const ROW = 40

/** One animation an item was asked to run. */
interface Asked {
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
  progress: number
  canceled: boolean
}

const asked = new Map<HTMLElement, Asked[]>()

/** The host an item sits in: the element whose parent is the body. */
const hostOf = (element: HTMLElement): HTMLElement => {
  let up = element
  while (up.parentElement && up.parentElement !== document.body) {
    up = up.parentElement
  }
  return up
}

/**
 * How far down the moves in flight are drawing an item now: its own latest
 * move and every one around it, as a browser draws the translations into the
 * item's box.
 */
const drawn = (element: HTMLElement): number => {
  let total = 0
  for (
    let up: HTMLElement | null = element;
    up && up.parentElement !== document.body;
    up = up.parentElement
  ) {
    const latest = asked
      .get(up)
      ?.findLast((one) => !one.canceled && one.options.composite === 'add')
    const from = /translate\(0px, (-?[\d.]+)px\)/.exec(String(latest?.keyframes[0]?.transform))
    total += latest && from ? Number(from[1]) * (1 - latest.progress) : 0
  }
  return total
}

/**
 * A row drawn at its place among the shown rows, in document order, so a row
 * inside another is drawn under it as a tree's branch is. It records every
 * animation it is asked for.
 */
const row = (name: string): HTMLElement => {
  const element = document.createElement('div')
  element.dataset.name = name
  element.getClientRects = () => (element.hidden ? [] : [{}]) as unknown as DOMRectList
  element.getBoundingClientRect = () => {
    const shown = [...hostOf(element).querySelectorAll<HTMLElement>('div')].filter(
      (one) => !one.closest('[hidden]'),
    )
    const top = (shown.indexOf(element) * ROW + drawn(element) - scrolled) * scale
    return { height: ROW * scale, left: 0, top, width: 200 * scale } as DOMRect
  }
  element.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const one: Asked = { canceled: false, keyframes, options, progress: 0 }
    asked.set(element, [...(asked.get(element) ?? []), one])
    return {
      cancel: () => {
        one.canceled = true
      },
      effect: { getComputedTiming: () => ({ progress: one.progress }) },
      get playState() {
        return one.canceled ? 'idle' : 'running'
      },
    } as unknown as Animation
  }) as HTMLElement['animate']
  return element
}

/** How much larger than its layout box the host is drawn. */
let scale = 1

/** How far the host's own box is scrolled down. */
let scrolled = 0

/** A plain element standing in for a Lit host, holding rows. */
const host = (...names: string[]) => {
  const element = document.createElement('div') as HTMLDivElement &
    ReactiveControllerHost & { controllers: ReactiveController[] }
  element.controllers = []
  element.addController = (controller) => element.controllers.push(controller)
  element.requestUpdate = () => {}
  element.removeController = () => {}
  Object.defineProperty(element, 'updateComplete', { value: Promise.resolve(true) })
  Object.defineProperty(element, 'offsetWidth', { get: () => 200 })
  Object.defineProperty(element, 'offsetHeight', { get: () => ROW * element.children.length })
  element.getBoundingClientRect = () =>
    ({
      height: ROW * element.children.length * scale,
      left: 0,
      top: 0,
      width: 200 * scale,
    }) as DOMRect
  element.append(...names.map(row))
  document.body.append(element)
  return element
}

/** A controller on a host, connected and recorded, moving at 200ms unless told otherwise. */
const moving = (
  element: ReturnType<typeof host>,
  duration = '200ms',
  more: Partial<ConstructorParameters<typeof LayoutMotionController>[1]> = {},
) => {
  if (duration) {
    element.style.setProperty('--list-move-duration', duration)
    element.style.setProperty('--list-move-easing', 'cubic-bezier(0.2, 0, 0, 1)')
  }
  const controller = new LayoutMotionController(element, {
    items: () => [...element.querySelectorAll<HTMLElement>('div')],
    timing: () => {
      const style = getComputedStyle(element)
      return {
        duration: style.getPropertyValue('--list-move-duration'),
        easing: style.getPropertyValue('--list-move-easing'),
      }
    },
    ...more,
  })
  controller.hostConnected()
  return controller
}

const rows = (element: HTMLElement) => [...element.children] as HTMLElement[]

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Brings every move asked for so far to its end. */
const finish = () => {
  for (const one of [...asked.values()].flat()) {
    one.progress = 1
  }
}

/** The translation the first keyframe of an item's latest animation starts from. */
const start = (element: HTMLElement): string | undefined =>
  asked.get(element)?.at(-1)?.keyframes[0]?.transform as string | undefined

let reduce = false
const realResizeObserver = globalThis.ResizeObserver
const realMatchMedia = globalThis.matchMedia

beforeEach(() => {
  asked.clear()
  scale = 1
  scrolled = 0
  reduce = false
  /* A real ResizeObserver reports once on observing, which is the first record. */
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      this.callback([], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  globalThis.matchMedia = ((query: string) => ({
    matches: query.includes('reduce') && reduce,
  })) as unknown as typeof matchMedia
})

afterEach(() => {
  globalThis.ResizeObserver = realResizeObserver
  globalThis.matchMedia = realMatchMedia
  document.body.replaceChildren()
})

describe('a host whose items move', () => {
  test('a sort slides each row from its old place to its new one', async () => {
    const element = host('a', 'b', 'c')
    moving(element)
    const [a, b, c] = rows(element) as [HTMLElement, HTMLElement, HTMLElement]
    element.append(b, a)
    await settle()
    expect(start(c)).toBe('translate(0px, 80px)')
    expect(start(b)).toBeUndefined()
    expect(start(a)).toBe('translate(0px, -80px)')
    expect(asked.get(c)?.[0]?.options).toMatchObject({ composite: 'add', duration: 200 })
  })

  test('a removed row closes its gap, and a hidden one does too', async () => {
    const element = host('a', 'b', 'c')
    moving(element)
    const [a, b, c] = rows(element) as [HTMLElement, HTMLElement, HTMLElement]
    a.remove()
    await settle()
    expect(start(b)).toBe('translate(0px, 40px)')
    expect(start(c)).toBe('translate(0px, 40px)')
    finish()
    b.hidden = true
    await settle()
    expect(start(c)).toBe('translate(0px, 40px)')
  })

  test('a row that arrives fades in, and the rows below it make room', async () => {
    const element = host('a', 'b')
    moving(element)
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    const arrived = row('new')
    element.prepend(arrived)
    await settle()
    expect(asked.get(arrived)?.[0]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(start(a)).toBe('translate(0px, -40px)')
    expect(start(b)).toBe('translate(0px, -40px)')
  })

  test('a row that draws itself is measured once it has drawn, so the rows below it still make room', async () => {
    const element = host('a', 'b')
    moving(element)
    const [a] = rows(element) as [HTMLElement, HTMLElement]
    const arrived = row('new')
    let drawn: (value: boolean) => void = () => {}
    Object.defineProperty(arrived, 'isUpdatePending', { value: true })
    Object.defineProperty(arrived, 'updateComplete', {
      value: new Promise<boolean>((resolve) => {
        drawn = resolve
      }),
    })
    element.prepend(arrived)
    await settle()
    expect(asked.get(a)).toBeUndefined()
    drawn(true)
    await settle()
    expect(start(a)).toBe('translate(0px, -40px)')
  })

  test('a list replaced with new rows arrives at once, as a page that renders it again would', async () => {
    const element = host('a', 'b')
    moving(element)
    const fresh = [row('c'), row('d')]
    element.replaceChildren(...fresh)
    await settle()
    expect(fresh.every((one) => !asked.has(one))).toBe(true)
  })

  test('a move interrupted mid-slide carries on from where the row is drawn', async () => {
    const element = host('a', 'b')
    moving(element)
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    element.append(a)
    await settle()
    expect(start(a)).toBe('translate(0px, -40px)')
    const first = asked.get(a)?.at(-1) as Asked
    first.progress = 0.5
    element.append(b)
    await settle()
    expect(first.canceled).toBe(true)
    expect(start(a)).toBe('translate(0px, 20px)')
  })

  test('a host drawn at twice its size moves its rows in layout pixels', async () => {
    scale = 2
    const element = host('a', 'b')
    moving(element)
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    element.append(a)
    await settle()
    expect(start(a)).toBe('translate(0px, -40px)')
    expect(start(b)).toBe('translate(0px, 40px)')
  })

  test('nothing moves where no stylesheet sets the duration, as on the headless tier', async () => {
    const element = host('a', 'b')
    moving(element, '')
    const [a] = rows(element) as [HTMLElement]
    element.append(a)
    await settle()
    expect(asked.size).toBe(0)
  })

  test('nothing moves under reduced motion, even with a literal duration', async () => {
    reduce = true
    const element = host('a', 'b')
    moving(element, '320ms')
    const [a] = rows(element) as [HTMLElement]
    element.append(a)
    await settle()
    expect(asked.size).toBe(0)
  })

  test('a change inside a row is no move', async () => {
    const element = host('a', 'b')
    moving(element)
    rows(element)[0]?.append('streamed text', document.createElement('span'))
    await settle()
    expect(asked.size).toBe(0)
  })

  test('a branch moved with its rows carries them, and they move only by the difference', async () => {
    const element = host('a', 'b')
    moving(element)
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    const leaf = row('a1')
    a.append(leaf)
    await settle()
    finish()
    asked.clear()
    element.append(a)
    await settle()
    expect(start(b)).toBe('translate(0px, 80px)')
    expect(start(a)).toBe('translate(0px, -40px)')
    expect(asked.has(leaf)).toBe(false)
  })

  test('a row added to a branch fades in, and a branch added with its rows fades once', async () => {
    const element = host('a', 'b')
    moving(element)
    const [a] = rows(element) as [HTMLElement]
    const leaf = row('a1')
    a.append(leaf)
    await settle()
    expect(asked.get(leaf)?.[0]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    const branch = row('c')
    const inside = row('c1')
    branch.append(inside)
    element.append(branch)
    await settle()
    expect(asked.get(branch)?.[0]?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }])
    expect(asked.has(inside)).toBe(false)
  })

  test('a row drawn by its cells moves as its cells, once the update that sorts it has finished', async () => {
    const element = host()
    const rowOf = (name: string): HTMLElement => {
      const contents = document.createElement('section')
      contents.style.display = 'contents'
      contents.append(row(name))
      return contents
    }
    element.append(rowOf('a'), rowOf('b'))
    const sections = () => [...element.querySelectorAll<HTMLElement>('section')]
    element.style.setProperty('--list-move-duration', '200ms')
    const controller = new LayoutMotionController(element, {
      items: sections,
      timing: () => ({
        duration: getComputedStyle(element).getPropertyValue('--list-move-duration'),
        easing: 'ease',
      }),
      watch: 'updates',
    })
    controller.hostConnected()
    const [first, second] = sections() as [HTMLElement, HTMLElement]
    element.append(first)
    await settle()
    expect(asked.size).toBe(0)
    controller.hostUpdated()
    await settle()
    expect(start(first.firstElementChild as HTMLElement)).toBe('translate(0px, -40px)')
    expect(start(second.firstElementChild as HTMLElement)).toBe('translate(0px, 40px)')
    expect(asked.has(first)).toBe(false)
  })

  test('a reader who scrolled the box between two changes sees only the change move', async () => {
    const element = host('a', 'b')
    element.style.setProperty('--list-move-duration', '200ms')
    Object.defineProperty(element, 'scrollTop', { get: () => scrolled })
    const controller = new LayoutMotionController(element, {
      items: () => [...element.querySelectorAll<HTMLElement>('div')],
      scroller: () => element,
      timing: () => ({
        duration: getComputedStyle(element).getPropertyValue('--list-move-duration'),
        easing: 'ease',
      }),
    })
    controller.hostConnected()
    scrolled = 30
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    element.append(a)
    await settle()
    expect(start(a)).toBe('translate(0px, -40px)')
    expect(start(b)).toBe('translate(0px, 40px)')
  })

  test('nothing is heard while disconnected', async () => {
    const element = host('a', 'b')
    const controller = moving(element)
    controller.hostDisconnected()
    const [a] = rows(element) as [HTMLElement]
    element.append(a)
    await settle()
    expect(asked.size).toBe(0)
  })
})

describe('an item that leaves, where the host names a box for its copy', () => {
  /* The copy is a clone, which keeps none of the row's stand-ins, so the
     copies' fades are heard on the prototype. */
  const fades: { copy: HTMLElement; keyframes: Keyframe[] }[] = []
  const realAnimate = HTMLElement.prototype.animate
  beforeEach(() => {
    fades.length = 0
    HTMLElement.prototype.animate = function (this: HTMLElement, keyframes: Keyframe[]) {
      fades.push({ copy: this, keyframes })
      return { finished: new Promise(() => {}) } as unknown as Animation
    } as HTMLElement['animate']
  })
  afterEach(() => {
    HTMLElement.prototype.animate = realAnimate
  })

  test('fades as a copy where it was, hidden and inert, while the rest close up', async () => {
    const element = host('a', 'b', 'c')
    const box = document.createElement('section')
    document.body.append(box)
    moving(element, '200ms', { leaving: () => box })
    const [a, b] = rows(element) as [HTMLElement, HTMLElement]
    b.remove()
    await settle()
    const copy = box.firstElementChild as HTMLElement
    expect(copy?.dataset.name).toBe('b')
    expect(copy.getAttribute('aria-hidden')).toBe('true')
    expect(copy.inert).toBe(true)
    expect(copy.style.top).toBe('40px')
    expect(copy.style.position).toBe('absolute')
    expect(fades.at(-1)?.keyframes.at(-1)?.opacity).toBe(0)
    expect(start(a)).toBeUndefined()
  })

  test('leaves no copy where the host names no box, nor under reduced motion', async () => {
    const element = host('a', 'b')
    const box = document.createElement('section')
    document.body.append(box)
    moving(element)
    ;(rows(element)[1] as HTMLElement).remove()
    await settle()
    reduce = true
    const other = host('c', 'd')
    moving(other, '200ms', { leaving: () => box })
    ;(rows(other)[1] as HTMLElement).remove()
    await settle()
    expect(box.childElementCount).toBe(0)
  })
})

describe('a list that was empty', () => {
  test('stands still as its first items arrive, unless the host says they arrive', async () => {
    const still = host()
    moving(still)
    still.append(row('a'))
    await settle()
    expect(asked.get(still.firstElementChild as HTMLElement)).toBeUndefined()
    const arriving = host()
    moving(arriving, '200ms', { arriveIntoEmpty: true })
    arriving.append(row('b'))
    await settle()
    expect(asked.get(arriving.firstElementChild as HTMLElement)?.[0]?.keyframes[0]).toEqual({
      opacity: 0,
    })
  })
})
