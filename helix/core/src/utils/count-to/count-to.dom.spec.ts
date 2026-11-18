import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { countTo } from './count-to.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.body.replaceChildren()
})

/** A figure whose count the test moves by hand. */
const figure = (text: string) => {
  const clock = { finished: false, progress: 0 }
  const element = document.createElement('span')
  element.textContent = text
  element.animate = (() =>
    ({
      cancel: () => undefined,
      effect: { getComputedTiming: () => ({ progress: clock.finished ? null : clock.progress }) },
      get playState() {
        return clock.finished ? 'finished' : 'running'
      },
    }) as unknown as Animation) as HTMLElement['animate']
  document.body.append(element)
  return { clock, element }
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('counting a plain element', () => {
  test('counts from the figure its text reads as, writes each frame, and resolves on the last', async () => {
    const { clock, element } = figure('1,000')
    let done = false
    const counting = countTo(element, 2000).then(() => {
      done = true
    })
    clock.progress = 0.5
    await frame()
    expect(element.textContent).toBe('1,500')
    expect(done).toBe(false)
    clock.finished = true
    await counting
    expect(element.textContent).toBe('2,000')
    expect('addController' in element).toBe(false)
  })

  test('a second count carries on from the figure drawn, and the first resolves then', async () => {
    const { clock, element } = figure('0')
    let first = false
    void countTo(element, 100).then(() => {
      first = true
    })
    clock.progress = 0.5
    await frame()
    expect(element.textContent).toBe('50')
    const second = countTo(element, 0, { format: (value) => `${value} items` })
    await Promise.resolve()
    expect(first).toBe(true)
    clock.progress = 0.5
    await frame()
    expect(element.textContent).toBe('25 items')
    clock.finished = true
    await second
    expect(element.textContent).toBe('0 items')
  })

  test('writes the new figure at once with no time to take', async () => {
    const { element } = figure('5')
    await countTo(element, 9, { duration: 0 })
    expect(element.textContent).toBe('9')
  })
})
