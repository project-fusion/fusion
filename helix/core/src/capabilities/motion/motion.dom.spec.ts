import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { fakeEnvironment } from '../environment/fake.js'
import { setEnvironment } from '../environment/index.js'
import { serverEnvironment } from '../environment/server.js'
import type { Easing, Transition } from '../types.generated.js'
import { webMotion } from './web.js'

beforeAll(() => {
  registerDom()
})

/** The browser's `getComputedStyle`, put back after a spec that stands in for it. */
let computed: typeof getComputedStyle

beforeAll(() => {
  computed = globalThis.getComputedStyle
})

afterEach(() => {
  document.body.replaceChildren()
  setEnvironment(serverEnvironment)
  globalThis.getComputedStyle = computed
})

const SETTLE: Transition = { duration: 200, easing: 'decelerate' }

/** One animation a spec's element was asked for, which the spec finishes. */
interface Played {
  readonly keyframes: Keyframe[]
  readonly options: KeyframeAnimationOptions
  canceled: boolean
  /** Finishes the animation, as the browser does once its time has run, and waits for its call back. */
  readonly finish: () => Promise<void>
}

/**
 * A part in the document whose animations a spec runs. happy-dom runs an
 * animation on a timer and draws nothing, so each spec records what was asked
 * and finishes it itself.
 */
const part = (): { node: HTMLElement; played: Played[] } => {
  const node = document.createElement('div')
  const played: Played[] = []
  node.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const settle: { resolve?: () => void; reject?: (error: unknown) => void } = {}
    const finished = new Promise<void>((resolve, reject) => {
      settle.resolve = resolve
      settle.reject = reject
    })
    const one: Played = {
      canceled: false,
      finish: async () => {
        settle.resolve?.()
        await finished
      },
      keyframes,
      options,
    }
    played.push(one)
    return {
      cancel: () => {
        one.canceled = true
        settle.reject?.(new DOMException('The animation was canceled.', 'AbortError'))
      },
      finished,
    } as unknown as Animation
  }) as typeof node.animate
  document.body.append(node)
  return { node, played }
}

/** Counts the calls back a glide makes. */
const counter = () => {
  const count = {
    arrived: 0,
    done: (): void => {
      count.arrived += 1
    },
  }
  return count
}

/** Waits for the promises already settled to call back. */
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const style = (node: HTMLElement, property: string): string => node.style.getPropertyValue(property)

describe('webMotion.place', () => {
  test('draws a frame at once: a translate, a width, a height, and an opacity', () => {
    const { node, played } = part()
    webMotion.place(node, { height: 40, opacity: 0.5, width: 120, x: 10, y: 20 })
    expect(style(node, 'translate')).toBe('10px 20px')
    expect(style(node, 'width')).toBe('120px')
    expect(style(node, 'height')).toBe('40px')
    expect(style(node, 'opacity')).toBe('0.5')
    expect(played).toEqual([])
  })

  test('keeps the axis a frame leaves out where the element is drawn', () => {
    const { node } = part()
    webMotion.place(node, { x: 5, y: 7 })
    webMotion.place(node, { x: 20 })
    expect(style(node, 'translate')).toBe('20px 7px')
  })

  test('leaves the fields a frame leaves out alone', () => {
    const { node } = part()
    webMotion.place(node, { opacity: 0.5 })
    webMotion.place(node, { width: 80 })
    expect(style(node, 'opacity')).toBe('0.5')
    expect(style(node, 'translate')).toBe('')
  })

  test('ends the glide the element is in without calling it back', async () => {
    const { node, played } = part()
    const count = counter()
    webMotion.glide(node, { y: 48 }, SETTLE, count.done)
    webMotion.place(node, { y: 12 })
    await settled()
    expect(played[0]?.canceled).toBe(true)
    expect(style(node, 'translate')).toBe('0px 12px')
    expect(count.arrived).toBe(0)
  })
})

describe('webMotion.glide', () => {
  test('animates from where the element is drawn to the frame, and writes the frame to its style', () => {
    const { node, played } = part()
    webMotion.place(node, { height: 40, opacity: 1, width: 100, x: 0, y: 0 })
    const to = { height: 48, opacity: 0.5, width: 120, x: 30, y: 10 }
    webMotion.glide(node, to, SETTLE, () => undefined)
    expect(played).toHaveLength(1)
    expect(played[0]?.keyframes).toEqual([
      { height: '40px', opacity: '1', translate: '0px 0px', width: '100px' },
      { height: '48px', opacity: '0.5', translate: '30px 10px', width: '120px' },
    ])
    expect(played[0]?.options).toEqual({ duration: 200, easing: 'cubic-bezier(0, 0, 0, 1)' })
    expect(style(node, 'translate')).toBe('30px 10px')
  })

  test('calls back once the animation finishes', async () => {
    const { node, played } = part()
    const count = counter()
    webMotion.glide(node, { y: 48 }, SETTLE, count.done)
    expect(count.arrived).toBe(0)
    await played[0]?.finish()
    expect(count.arrived).toBe(1)
  })

  test('a stop cancels the animation without calling back', async () => {
    const { node, played } = part()
    const count = counter()
    const stop = webMotion.glide(node, { y: 48 }, SETTLE, count.done)
    stop()
    await settled()
    expect(played[0]?.canceled).toBe(true)
    expect(count.arrived).toBe(0)
  })

  test('a stop leaves the element where the glide had drawn it', () => {
    const { node } = part()
    webMotion.place(node, { x: 0, y: 0 })
    const stop = webMotion.glide(node, { y: 48 }, SETTLE, () => undefined)
    /* happy-dom draws no animation, so the spec stands in for the browser's
       reading partway through the glide. */
    globalThis.getComputedStyle = ((element: Element) => {
      const real = computed(element)
      return {
        getPropertyValue: (name: string) =>
          name === 'translate' ? '0px 30px' : real.getPropertyValue(name),
      }
    }) as typeof getComputedStyle
    stop()
    expect(style(node, 'translate')).toBe('0px 30px')
  })

  test('a glide that starts during another ends it without calling it back, and starts where it had drawn the element', async () => {
    const { node, played } = part()
    const arrived: string[] = []
    webMotion.place(node, { x: 0, y: 0 })
    webMotion.glide(node, { y: 48 }, SETTLE, () => arrived.push('first'))
    webMotion.glide(node, { x: 20 }, SETTLE, () => arrived.push('second'))
    expect(played[0]?.canceled).toBe(true)
    expect(played[1]?.keyframes).toEqual([{ translate: '0px 48px' }, { translate: '20px 48px' }])
    await played[1]?.finish()
    expect(arrived).toEqual(['second'])
  })

  test('uses the curve of the motion token where the page sets one', () => {
    const { node, played } = part()
    node.style.setProperty('--helix-easing-spring', 'linear(0, 1.2, 1)')
    webMotion.glide(node, { y: 48 }, { duration: 200, easing: 'spring' }, () => undefined)
    expect(played[0]?.options.easing).toBe('linear(0, 1.2, 1)')
  })

  test('uses the shipped curve of each motion token where the page sets none', () => {
    const { node, played } = part()
    const curves: Record<Easing, string> = {
      accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
      decelerate: 'cubic-bezier(0, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.3, 0, 0, 1.2)',
      linear: 'linear',
      spring:
        'linear(0, 0.006, 0.025, 0.101, 0.539, 0.826, 0.976, 1.037, 1.043, 1.026, 1.006, 0.997, 1)',
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
    }
    const easings = Object.keys(curves) as Easing[]
    for (const easing of easings) {
      webMotion.glide(node, { y: 48 }, { duration: 200, easing }, () => undefined)
    }
    expect(played.map((one) => one.options.easing)).toEqual(easings.map((easing) => curves[easing]))
  })

  test('arrives at once where the environment says the reader asks for reduced motion', () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const { node, played } = part()
    const count = counter()
    webMotion.glide(node, { opacity: 0, y: 48 }, SETTLE, count.done)
    expect(played).toEqual([])
    expect(count.arrived).toBe(1)
    expect(style(node, 'translate')).toBe('0px 48px')
    expect(style(node, 'opacity')).toBe('0')
  })

  test('arrives at once with no length', () => {
    const { node, played } = part()
    const count = counter()
    webMotion.glide(node, { y: 48 }, { duration: 0, easing: 'standard' }, count.done)
    expect(played).toEqual([])
    expect(count.arrived).toBe(1)
  })

  test('arrives at once where the browser refuses the animation', () => {
    const { node } = part()
    node.animate = () => {
      throw new TypeError('The easing is not valid.')
    }
    const count = counter()
    webMotion.glide(node, { y: 48 }, SETTLE, count.done)
    expect(count.arrived).toBe(1)
    expect(style(node, 'translate')).toBe('0px 48px')
  })
})
