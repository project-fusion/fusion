import { describe, expect, test } from 'bun:test'
import { blurOf, clipEdges, clipOf, SPOTLIGHT_SPREAD, sized, spotlightOf } from './effects'
import type { Resolution } from './resolved'

const declared = (property: string, value: Resolution) => new Map([[property, value]])

describe('a backdrop blur', () => {
  test('is the radius of its blur, in points, and consumes the property', () => {
    const resolved = declared('backdrop-filter', 'blur(32)')
    expect(blurOf(resolved, 16)).toBe(32)
    expect(resolved.has('backdrop-filter')).toBe(false)
    expect(blurOf(declared('backdrop-filter', 'blur(1rem)'), 16)).toBe(16)
  })

  test('draws the blur of a list of filters alone', () => {
    expect(blurOf(declared('backdrop-filter', 'blur(16px) saturate(1.5)'), 16)).toBe(16)
  })

  test('blurs nothing under none, and leaves a list with no blur to be named', () => {
    const none = declared('backdrop-filter', 'none')
    expect(blurOf(none, 16)).toBeUndefined()
    expect(none.size).toBe(0)
    const saturated = declared('backdrop-filter', 'saturate(1.5)')
    expect(blurOf(saturated, 16)).toBeUndefined()
    expect(saturated.has('backdrop-filter')).toBe(true)
  })
})

describe('a clip', () => {
  test('reads one to four insets clockwise from the top, and a rounding', () => {
    expect(clipOf(declared('clip-path', 'inset(0 0 100% 0)'), 16)).toEqual({
      bottom: '100%',
      left: 0,
      right: 0,
      top: 0,
    })
    expect(clipOf(declared('clip-path', 'inset(4px -32px)'), 16)).toEqual({
      bottom: 4,
      left: -32,
      right: -32,
      top: 4,
    })
    expect(clipOf(declared('clip-path', 'inset(0 round 8px)'), 16)).toEqual({
      bottom: 0,
      left: 0,
      radius: 8,
      right: 0,
      top: 0,
    })
  })

  test('leaves a shape other than an inset to be named', () => {
    const polygon = declared('clip-path', 'polygon(0% 0%, 100% 50%, 0% 100%)')
    expect(clipOf(polygon, 16)).toBeUndefined()
    expect(polygon.has('clip-path')).toBe(true)
  })

  test('takes a percentage as a share of the box, the top and bottom of its height', () => {
    const clip = { bottom: '100%', left: '10%', right: 0, top: 0 }
    expect(sized(clip)).toBe(true)
    expect(clipEdges(clip, 200, 80)).toEqual({ bottom: 80, left: 20, right: 0, top: 0 })
    expect(sized({ bottom: 0, left: 0, right: 0, top: 4 })).toBe(false)
  })
})

describe('a spotlight', () => {
  test('is one shadow with no offset and no blur, spread past any window', () => {
    expect(spotlightOf(`0px 0px 0px ${SPOTLIGHT_SPREAD * 2}px rgba(0, 0, 0, 0.5)`)).toEqual({
      color: 'rgba(0, 0, 0, 0.5)',
      spread: SPOTLIGHT_SPREAD * 2,
    })
  })

  test('is no shadow that is offset, blurred, spread a little, or one of several', () => {
    expect(spotlightOf('0px 4px 0px 2000px black')).toBeUndefined()
    expect(spotlightOf('0px 0px 12px 2000px black')).toBeUndefined()
    expect(spotlightOf('0px 0px 0px 4px black')).toBeUndefined()
    expect(spotlightOf('0px 0px 0px 2000px black, 0px 1px 2px red')).toBeUndefined()
    expect(spotlightOf(undefined)).toBeUndefined()
  })
})
