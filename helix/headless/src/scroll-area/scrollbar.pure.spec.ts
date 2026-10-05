import { describe, expect, test } from 'bun:test'
import {
  alongTrack,
  extentOf,
  hasScrollbar,
  offsetAt,
  scrollFraction,
  scrollPerPixel,
  showsScrollbar,
  thumbFraction,
} from './scrollbar.js'

describe('the thumb', () => {
  test('covers the share of the content in view', () => {
    expect(thumbFraction({ client: 100, offset: 0, scroll: 400 })).toBe(0.25)
  })

  test('fills the track where everything is in view, or nothing is there', () => {
    expect(thumbFraction({ client: 100, offset: 0, scroll: 100 })).toBe(1)
    expect(thumbFraction({ client: 100, offset: 0, scroll: 0 })).toBe(1)
  })
})

describe('how far along', () => {
  test('runs from 0 at the start to 1 at the end', () => {
    expect(scrollFraction({ client: 100, offset: 0, scroll: 400 })).toBe(0)
    expect(scrollFraction({ client: 100, offset: 150, scroll: 400 })).toBe(0.5)
    expect(scrollFraction({ client: 100, offset: 300, scroll: 400 })).toBe(1)
  })

  test('stays inside the run when a browser overshoots, and is 0 with nothing to scroll', () => {
    /* An elastic overscroll reports an offset past the end for a moment. */
    expect(scrollFraction({ client: 100, offset: 340, scroll: 400 })).toBe(1)
    expect(scrollFraction({ client: 100, offset: 0, scroll: 80 })).toBe(0)
  })
})

describe('dragging the thumb', () => {
  test('moves the content by the gearing between the two runs', () => {
    /* A 200 track with a 50 thumb leaves 150 to travel, and the content has 300. */
    expect(scrollPerPixel({ client: 100, offset: 0, scroll: 400 }, 200, 50)).toBe(2)
  })

  test('moves nothing where the thumb fills the track', () => {
    expect(scrollPerPixel({ client: 100, offset: 0, scroll: 400 }, 50, 50)).toBe(0)
  })
})

describe('pressing the track', () => {
  const extent = { client: 100, offset: 0, scroll: 400 }

  test('puts the middle of the thumb under the press', () => {
    /* A press at 100 on a 200 track puts a 50 thumb's start at 75, half its run. */
    expect(offsetAt(extent, 100, 200, 50)).toBe(150)
  })

  test('stops at either end', () => {
    expect(offsetAt(extent, 0, 200, 50)).toBe(0)
    expect(offsetAt(extent, 200, 200, 50)).toBe(300)
  })
})

describe('whether a scrollbar is drawn', () => {
  test('needs an axis that scrolls, and content past it unless always', () => {
    expect(hasScrollbar('auto', true, true)).toBe(true)
    expect(hasScrollbar('auto', true, false)).toBe(false)
    expect(hasScrollbar('always', true, false)).toBe(true)
    expect(hasScrollbar('always', false, true)).toBe(false)
  })

  test('shows the whole time under auto and always', () => {
    const idle = { active: false, held: false, hovered: false }
    expect(showsScrollbar('auto', idle)).toBe(true)
    expect(showsScrollbar('always', idle)).toBe(true)
  })

  test('shows while scrolling or held under scroll, and on hover too under hover', () => {
    const idle = { active: false, held: false, hovered: false }
    expect(showsScrollbar('scroll', idle)).toBe(false)
    expect(showsScrollbar('scroll', { ...idle, active: true })).toBe(true)
    expect(showsScrollbar('scroll', { ...idle, held: true })).toBe(true)
    expect(showsScrollbar('scroll', { ...idle, hovered: true })).toBe(false)
    expect(showsScrollbar('hover', { ...idle, hovered: true })).toBe(true)
  })
})

describe('reading a box', () => {
  const box = {
    clientHeight: 100,
    clientWidth: 200,
    scrollHeight: 400,
    scrollLeft: -50,
    scrollTop: 30,
    scrollWidth: 800,
  }

  test('reads each axis, counting a right-to-left offset from zero', () => {
    expect(extentOf(box, 'vertical')).toEqual({ client: 100, offset: 30, scroll: 400 })
    expect(extentOf(box, 'horizontal')).toEqual({ client: 200, offset: 50, scroll: 800 })
  })

  test('places a pointer along a track from its start, the right edge on a right-to-left page', () => {
    const track = { bottom: 300, left: 10, right: 210, top: 100 }
    expect(alongTrack(150, track, 'vertical', false)).toBe(50)
    expect(alongTrack(60, track, 'horizontal', false)).toBe(50)
    expect(alongTrack(160, track, 'horizontal', true)).toBe(50)
  })
})
