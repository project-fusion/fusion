import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { CountController } from './count-controller.js'

beforeAll(() => {
  registerDom()
})

const realMatchMedia = globalThis.matchMedia

afterEach(() => {
  globalThis.matchMedia = realMatchMedia
})

/** A count the test moves by hand: each figure is the one for the progress set here. */
interface Clock {
  canceled: boolean
  finished: boolean
  progress: number
}

/** A plain element standing in for a Lit host, counting updates asked for, with a clock the test drives. */
const host = (duration = '320ms') => {
  const clock: Clock = { canceled: false, finished: false, progress: 0 }
  const element = document.createElement('div') as HTMLDivElement &
    ReactiveControllerHost & { updates: number }
  element.updates = 0
  element.addController = (_controller: ReactiveController) => {}
  element.requestUpdate = () => {
    element.updates += 1
  }
  element.removeController = () => {}
  element.animate = (() =>
    ({
      cancel: () => {
        clock.canceled = true
      },
      effect: { getComputedTiming: () => ({ progress: clock.finished ? null : clock.progress }) },
      get playState() {
        return clock.finished ? 'finished' : 'running'
      },
    }) as unknown as Animation) as HTMLElement['animate']
  const count = new CountController(element, { timing: () => ({ duration, easing: 'ease' }) })
  return { clock, count, element }
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('a count', () => {
  test('passes through the figures between, rounded to the decimals the two have, and rests', async () => {
    const { clock, count, element } = host()
    count.start(100, 200)
    expect(count.counting).toBe(100)
    clock.progress = 0.333
    await frame()
    expect(count.counting).toBe(133)
    clock.finished = true
    await frame()
    expect(count.counting).toBeUndefined()
    expect(element.updates).toBeGreaterThan(1)
  })

  test('keeps the decimals a figure has', async () => {
    const { clock, count } = host()
    count.start(98.2, 99.6)
    clock.progress = 0.5
    await frame()
    expect(count.counting).toBe(98.9)
  })

  test('a count interrupted by another starts from the figure drawn', async () => {
    const { clock, count } = host()
    count.start(0, 100)
    clock.progress = 0.4
    await frame()
    count.start(100, 0)
    expect(clock.canceled).toBe(true)
    expect(count.counting).toBe(40)
  })

  test('counts nothing with no duration, as on the headless tier, or under reduced motion', () => {
    const quiet = host('')
    quiet.count.start(1, 2)
    expect(quiet.count.counting).toBeUndefined()
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof matchMedia
    const reduced = host('320ms')
    reduced.count.start(1, 2)
    expect(reduced.count.counting).toBeUndefined()
  })
})
