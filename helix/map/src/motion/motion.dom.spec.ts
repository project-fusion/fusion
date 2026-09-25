import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { easingOf, millisecondsOf, motionOf } from './motion.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  delete (globalThis as { matchMedia?: unknown }).matchMedia
})

describe('millisecondsOf', () => {
  test('a CSS time in either unit, and nothing that is not one', () => {
    expect(millisecondsOf('200ms')).toBe(200)
    expect(millisecondsOf(' 0.32s ')).toBe(320)
    expect(millisecondsOf('0ms')).toBe(0)
    expect(millisecondsOf('')).toBeNull()
    expect(millisecondsOf('var(--x)')).toBeNull()
  })
})

describe('easingOf', () => {
  test('a cubic Bézier starts at 0, ends at 1, and is solved for time rather than read off its parameter', () => {
    const standard = easingOf('cubic-bezier(0.2, 0, 0, 1)')
    expect(standard(0)).toBe(0)
    expect(standard(1)).toBe(1)
    // An ease-out: well past halfway at halfway.
    expect(standard(0.5)).toBeGreaterThan(0.8)
    // The same curve CSS calls `linear` is a straight line.
    expect(easingOf('cubic-bezier(0, 0, 1, 1)')(0.3)).toBeCloseTo(0.3, 4)
  })

  test('an emphasized curve overshoots, since its last control point is above 1', () => {
    const emphasized = easingOf('cubic-bezier(0.3, 0, 0, 1.2)')
    const peak = Math.max(...Array.from({ length: 50 }, (_, at) => emphasized(at / 50)))
    expect(peak).toBeGreaterThan(1)
  })

  test('`linear()` joins its outputs, spreading the inputs it was not given', () => {
    const joined = easingOf('linear(0, 1, 0.5)')
    expect(joined(0)).toBe(0)
    expect(joined(0.25)).toBeCloseTo(0.5, 6)
    expect(joined(0.5)).toBe(1)
    expect(joined(1)).toBe(0.5)
  })

  test('and places the ones it was given, which the spring the theme writes has none of', () => {
    const stopped = easingOf('linear(0, 0.9 20%, 1)')
    expect(stopped(0.2)).toBeCloseTo(0.9, 6)
    expect(stopped(0.6)).toBeCloseTo(0.95, 6)
    const spring = easingOf(`linear(
      0,
      0.5,
      1.04,
      1
    )`)
    expect(spring(1)).toBe(1)
  })

  test('the named curves, and the standard curve for what it cannot read', () => {
    expect(easingOf('linear')(0.4)).toBe(0.4)
    expect(easingOf('ease-in')(0.5)).toBeLessThan(0.5)
    expect(easingOf('steps(4)')(0.5)).toBe(easingOf('cubic-bezier(0.2, 0, 0, 1)')(0.5))
  })
})

describe('motionOf', () => {
  test('the page’s own tokens where they are, and the shipped ones where they are not', () => {
    const bare = document.createElement('div')
    document.body.append(bare)
    expect(motionOf(bare, 'step')?.duration).toBe(200)
    expect(motionOf(bare, 'travel')?.duration).toBe(320)

    bare.style.setProperty('--helix-duration-slow', '480ms')
    expect(motionOf(bare, 'travel')?.duration).toBe(480)
  })

  test('a duration of zero is a jump, and so is a reader asking for less motion', () => {
    const themed = document.createElement('div')
    document.body.append(themed)
    themed.style.setProperty('--helix-duration-normal', '0ms')
    expect(motionOf(themed, 'step')).toBeNull()

    ;(globalThis as { matchMedia?: unknown }).matchMedia = (query: string) => ({
      matches: query.includes('reduce'),
    })
    expect(motionOf(document.body, 'travel')).toBeNull()
  })
})
