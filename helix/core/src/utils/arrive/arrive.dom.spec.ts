import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { arrive } from './arrive.js'

beforeAll(() => {
  registerDom()
})

const frame = () => new Promise((resolve) => setTimeout(resolve, 40))

const realMatchMedia = globalThis.matchMedia

afterEach(() => {
  globalThis.matchMedia = realMatchMedia
  document.body.replaceChildren()
})

/** An element that records what it is asked to animate, with the tokens set on it. */
const element = (duration: string) => {
  const one = document.createElement('div')
  one.style.setProperty('--helix-duration-normal', duration)
  one.style.setProperty('--helix-easing-decelerate', 'cubic-bezier(0, 0, 0, 1)')
  const asked: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = []
  one.animate = ((keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    asked.push({ keyframes, options })
    return {} as Animation
  }) as HTMLElement['animate']
  document.body.append(one)
  return { asked, one }
}

const options = {
  duration: '--helix-duration-normal',
  easing: '--helix-easing-decelerate',
  from: { opacity: 0 },
}

describe('arrive', () => {
  test('brings the element in from where it starts, a frame later, at the tokens named', async () => {
    const { asked, one } = element('200ms')
    arrive(one, options)
    expect(asked).toHaveLength(0)
    await frame()
    expect(asked[0]?.keyframes[0]).toEqual({ opacity: 0 })
    expect(asked[0]?.options).toEqual({ duration: 200, easing: 'cubic-bezier(0, 0, 0, 1)' })
  })

  test('moves nothing with no token, nor for a reader who asked for less motion', async () => {
    const none = element('')
    arrive(none.one, options)
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof matchMedia
    const reduced = element('200ms')
    arrive(reduced.one, options)
    await frame()
    expect(none.asked).toHaveLength(0)
    expect(reduced.asked).toHaveLength(0)
  })
})
