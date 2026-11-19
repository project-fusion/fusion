import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { pauseMotion } from '../page-motion/page-motion.js'
import { readColorAlpha } from '../read-color/read-color.js'
import { burstConfetti } from './burst-confetti.js'

const real = {
  getContext: undefined as unknown as HTMLCanvasElement['getContext'],
  matchMedia: undefined as unknown as typeof matchMedia,
  requestAnimationFrame: undefined as unknown as typeof requestAnimationFrame,
}

beforeAll(() => {
  registerDom()
  /* `readColorAlpha` keeps the first canvas it makes for good, so it makes
     happy-dom's own before any test stands one in. */
  readColorAlpha('#000')
  real.getContext = HTMLCanvasElement.prototype.getContext
  real.matchMedia = globalThis.matchMedia
  real.requestAnimationFrame = globalThis.requestAnimationFrame
})

afterEach(() => {
  pauseMotion(false)
  HTMLCanvasElement.prototype.getContext = real.getContext
  globalThis.matchMedia = real.matchMedia
  globalThis.requestAnimationFrame = real.requestAnimationFrame
  document.body.replaceChildren()
})

/** A button to burst from, in the page. */
const origin = (): HTMLElement => {
  const button = document.createElement('button')
  button.textContent = 'Publish'
  document.body.append(button)
  return button
}

/**
 * A 2D context that draws nothing, since happy-dom has none, and frames a
 * fifth of a second apart, so a burst ends in a few of them.
 */
const standIn = (): { drawn: () => number } => {
  let fills = 0
  const context = new Proxy(
    {},
    {
      get: (_, name) =>
        name === 'fillRect' || name === 'fill'
          ? () => {
              fills += 1
            }
          : () => undefined,
      set: () => true,
    },
  )
  HTMLCanvasElement.prototype.getContext = (() => context) as never
  let now = 0
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    now += 200
    return setTimeout(() => callback(now), 0) as unknown as number
  }) as typeof requestAnimationFrame
  return { drawn: () => fills }
}

const canvases = () => document.querySelectorAll('canvas')

describe('bursting confetti', () => {
  test('draws nothing and resolves at once for a reader who asked for less motion', async () => {
    standIn()
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof matchMedia
    await burstConfetti(origin())
    expect(canvases().length).toBe(0)
  })

  test('draws nothing and resolves at once while the page has paused its motion', async () => {
    standIn()
    pauseMotion()
    await burstConfetti(origin())
    expect(canvases().length).toBe(0)
  })

  test('draws on one canvas hidden from screen readers, and removes it once the last piece is gone', async () => {
    const { drawn } = standIn()
    const bursting = burstConfetti(origin(), { colors: ['red', 'not a color'], count: 12 })
    expect(canvases().length).toBe(1)
    const canvas = canvases()[0]
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(canvas?.style.pointerEvents).toBe('none')
    expect(canvas?.style.position).toBe('fixed')
    await bursting
    expect(drawn()).toBeGreaterThan(0)
    expect(canvases().length).toBe(0)
  })

  test('a second burst while one runs draws on the same canvas, and each resolves', async () => {
    standIn()
    const button = origin()
    const first = burstConfetti(button, { count: 10 })
    const second = burstConfetti(button, { count: 10 })
    expect(canvases().length).toBe(1)
    await Promise.all([first, second])
    expect(canvases().length).toBe(0)
  })

  test('pausing the page mid-burst ends it', async () => {
    standIn()
    const bursting = burstConfetti(origin())
    pauseMotion()
    await bursting
    expect(canvases().length).toBe(0)
  })

  test('draws nothing for an element out of the page, or a count of none', async () => {
    standIn()
    await burstConfetti(document.createElement('button'))
    await burstConfetti(origin(), { count: 0 })
    expect(canvases().length).toBe(0)
  })
})
