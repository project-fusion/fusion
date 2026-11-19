import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { resizeFrom } from './resize-from.js'

beforeAll(() => {
  registerDom()
})

/* happy-dom lays nothing out and its observer never reports, so the spec
   supplies both halves: an observer that reports when the test says so, and
   an element whose height and animations it records. */
const original = globalThis.ResizeObserver
const watchers: Array<() => void> = []

afterEach(() => {
  globalThis.ResizeObserver = original
  watchers.length = 0
  document.body.replaceChildren()
})

const observe = (): void => {
  globalThis.ResizeObserver = class {
    private readonly report: () => void
    constructor(report: () => void) {
      this.report = report
    }
    observe(): void {
      watchers.push(() => this.report())
    }
    /* A report is made by the test, once, so there is nothing to stop. */
    disconnect(): void {}
    unobserve(): void {}
  } as unknown as typeof ResizeObserver
}

const box = (height: number) => {
  const element = document.createElement('div')
  const moves: Array<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = []
  const record = { canceled: 0, height, moves }
  element.getBoundingClientRect = () => ({ height: record.height }) as DOMRect
  element.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    moves.push({ keyframes, options })
    return { cancel: () => record.canceled++ } as unknown as Animation
  }) as HTMLElement['animate']
  document.body.append(element)
  return { element, record }
}

describe('resizeFrom', () => {
  test('moves the height from the one given to the one laid out next, on the timing read then', async () => {
    observe()
    const { element, record } = box(40)
    const moving = resizeFrom(element, 40, {
      timing: () => ({ duration: '0.32s', easing: 'linear' }),
    })
    record.height = 120
    watchers[0]?.()
    expect(await moving).toBeDefined()
    expect(record.moves[0]?.keyframes).toEqual([{ blockSize: '40px' }, { blockSize: '120px' }])
    expect(record.moves[0]?.options).toEqual({ duration: 320, easing: 'linear' })
  })

  test('moves nothing within a pixel, or under a millisecond', async () => {
    observe()
    const { element, record } = box(40)
    const still = resizeFrom(element, 40.5, { timing: () => ({ duration: 200, easing: '' }) })
    watchers[0]?.()
    expect(await still).toBeUndefined()
    const off = resizeFrom(element, 10, { timing: () => ({ duration: '0ms', easing: '' }) })
    watchers[1]?.()
    expect(await off).toBeUndefined()
    expect(record.moves).toHaveLength(0)
  })

  test('ends the move in flight before it measures, so the new one reads the resting height', async () => {
    observe()
    const { element, record } = box(80)
    const previous = { cancel: () => record.canceled++ } as unknown as Animation
    const moving = resizeFrom(element, 80, {
      previous,
      timing: () => ({ duration: 200, easing: 'ease' }),
    })
    expect(record.canceled).toBe(0)
    record.height = 30
    watchers[0]?.()
    await moving
    expect(record.canceled).toBe(1)
    expect(record.moves[0]?.keyframes).toEqual([{ blockSize: '80px' }, { blockSize: '30px' }])
  })

  test('moves nothing where the reader asked for reduced motion', async () => {
    observe()
    const matches = globalThis.matchMedia
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof matchMedia
    try {
      const { element, record } = box(40)
      expect(
        await resizeFrom(element, 10, { timing: () => ({ duration: 200, easing: '' }) }),
      ).toBeUndefined()
      expect(watchers).toHaveLength(0)
      expect(record.moves).toHaveLength(0)
    } finally {
      globalThis.matchMedia = matches
    }
  })
})
