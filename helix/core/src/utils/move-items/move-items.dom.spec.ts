import '@fusion.dev/helix-testing/dom/register'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { moveItems } from './move-items.js'

const realResizeObserver = globalThis.ResizeObserver

beforeAll(() => {
  registerDom()
  /* A browser's ResizeObserver reports once on observing, which is the first
     record of where the rows are. happy-dom's never reports. */
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      this.callback([], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterAll(() => {
  globalThis.ResizeObserver = realResizeObserver
})

afterEach(() => {
  document.body.replaceChildren()
})

/** The height of a row. happy-dom lays out nothing, so each row is placed by its index. */
const ROW = 40

/** What each row was asked to animate. */
const asked = new Map<string, { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[]>()

/** A plain list whose rows are drawn one under another and record their animations. */
const list = (names: string[]): HTMLUListElement => {
  const element = document.createElement('ul')
  element.getBoundingClientRect = () => ({ height: 200, left: 0, top: 0, width: 200 }) as DOMRect
  Object.defineProperty(element, 'offsetWidth', { get: () => 200 })
  Object.defineProperty(element, 'offsetHeight', { get: () => 200 })
  for (const name of names) {
    const row = document.createElement('li')
    row.textContent = name
    row.getClientRects = () => [{}] as unknown as DOMRectList
    row.getBoundingClientRect = () => {
      const top = [...element.children].indexOf(row) * ROW
      return { height: ROW, left: 0, top, width: 200 } as DOMRect
    }
    row.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      asked.set(name, [...(asked.get(name) ?? []), { keyframes, options }])
      return {
        cancel: () => undefined,
        effect: { getComputedTiming: () => ({ progress: 0 }) },
        finished: Promise.resolve(),
        playState: 'running',
      } as unknown as Animation
    }) as HTMLElement['animate']
    element.append(row)
  }
  document.body.append(element)
  return element
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('moving the items of a plain element', () => {
  test('slides a reordered row from its old place, at the time Helix’s token holds', async () => {
    asked.clear()
    const element = list(['a', 'b', 'c'])
    const stop = moveItems(element)
    await settle()
    element.append(element.children[0] as HTMLElement)
    await settle()
    const moved = asked.get('a')?.at(-1)
    expect(moved?.keyframes[0]?.transform).toBe('translate(0px, -80px)')
    expect(moved?.options.duration).toBe(200)
    stop()
  })

  test('takes a time of its own, and moves nothing at 0 or once stopped', async () => {
    asked.clear()
    const element = list(['a', 'b'])
    const stop = moveItems(element, { duration: 0 })
    await settle()
    element.append(element.children[0] as HTMLElement)
    await settle()
    expect(asked.get('a')).toBeUndefined()
    stop()

    const timed = list(['c', 'd'])
    const off = moveItems(timed, { duration: '320ms' })
    await settle()
    timed.append(timed.children[0] as HTMLElement)
    await settle()
    expect(asked.get('c')?.at(-1)?.options.duration).toBe(320)
    off()
    timed.append(timed.children[0] as HTMLElement)
    await settle()
    expect(asked.get('c')).toHaveLength(1)
  })
})
