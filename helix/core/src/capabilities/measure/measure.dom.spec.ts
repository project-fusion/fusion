import '@fusion.dev/helix-testing/dom/register'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Rect } from '../types.generated.js'
import { webMeasure } from './web.js'

/**
 * A `ResizeObserver` a spec calls itself. happy-dom's observes nothing and
 * calls nothing, and every element's box there is `0 0 0 0`, so each spec
 * places the box and reports the resize that layout would.
 */
class Observer {
  static made: Observer[] = []
  readonly observed: Element[] = []
  disconnected = false
  readonly #callback: () => void

  constructor(callback: () => void) {
    this.#callback = callback
    Observer.made.push(this)
  }

  observe(node: Element): void {
    this.observed.push(node)
  }

  unobserve(): void {
    // Nothing here calls it.
  }

  disconnect(): void {
    this.disconnected = true
  }

  /** Reports a resize, as layout does. */
  resize(): void {
    this.#callback()
  }
}

let platform: typeof ResizeObserver

beforeAll(() => {
  registerDom()
  platform = globalThis.ResizeObserver
  globalThis.ResizeObserver = Observer as unknown as typeof ResizeObserver
})

afterAll(() => {
  globalThis.ResizeObserver = platform
})

/** What each spec put in the document, taken out after it. */
const added: Element[] = []

afterEach(() => {
  for (const node of added.splice(0)) {
    node.remove()
  }
  Observer.made = []
})

const BOX: Rect = { height: 40, width: 120, x: 10, y: 20 }

/** A node in the document whose box is `rect`. */
const placed = (rect: Rect): HTMLElement => {
  const node = document.createElement('div')
  const { height, width, x, y } = rect
  const full = { bottom: y + height, height, left: x, right: x + width, top: y, width, x, y }
  node.getBoundingClientRect = () => ({ ...full, toJSON: () => full })
  document.body.append(node)
  added.push(node)
  return node
}

describe('webMeasure.box', () => {
  test("reads the box of a node in the document, in the viewport's coordinates", () => {
    expect(webMeasure.box(placed(BOX))).toEqual(BOX)
  })

  test('reads null for a node out of the document', () => {
    const node = placed(BOX)
    node.remove()
    expect(webMeasure.box(node)).toBeNull()
  })
})

describe('webMeasure.observe', () => {
  test('makes one ResizeObserver for a node, however many observe it', () => {
    const node = placed(BOX)
    const heard: string[] = []
    const first = webMeasure.observe(node, (box) => heard.push(`first ${box.width}`))
    const second = webMeasure.observe(node, (box) => heard.push(`second ${box.width}`))
    expect(Observer.made).toHaveLength(1)
    expect(Observer.made[0]?.observed).toEqual([node])
    Observer.made[0]?.resize()
    expect(heard).toEqual(['first 120', 'second 120'])
    first()
    second()
  })

  test('makes an observer of its own for each node', () => {
    const stops = [webMeasure.observe(placed(BOX), () => undefined)]
    stops.push(webMeasure.observe(placed(BOX), () => undefined))
    expect(Observer.made).toHaveLength(2)
    for (const stop of stops) {
      stop()
    }
  })

  test('disconnects the observer once the last observer of its node stops', () => {
    const node = placed(BOX)
    const changed = (): void => undefined
    const first = webMeasure.observe(node, changed)
    const second = webMeasure.observe(node, changed)
    const observer = Observer.made[0]
    first()
    first()
    expect(observer?.disconnected).toBe(false)
    second()
    expect(observer?.disconnected).toBe(true)
    webMeasure.observe(node, changed)()
    expect(Observer.made).toHaveLength(2)
  })

  test('passes on no resize after the node leaves the document', () => {
    const node = placed(BOX)
    const heard: Rect[] = []
    const stop = webMeasure.observe(node, (box) => heard.push(box))
    node.remove()
    Observer.made[0]?.resize()
    expect(heard).toEqual([])
    stop()
  })
})
