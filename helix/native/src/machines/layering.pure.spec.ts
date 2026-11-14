import { describe, expect, test } from 'bun:test'
import {
  anchorOffset,
  beyond,
  closedByOf,
  dismisses,
  inside,
  MARGIN,
  paddingFor,
  placementOf,
  shifted,
  tabbed,
} from './layering'

describe('a layer’s arithmetic', () => {
  test('a placement is Floating UI’s, bottom-start where it names none', () => {
    expect(placementOf('top-end')).toBe('top-end')
    expect(placementOf('left')).toBe('left')
    expect(placementOf('above')).toBe('bottom-start')
    expect(placementOf(undefined)).toBe('bottom-start')
  })

  test('the room kept from the window is the margin, and the keyboard below while it shows', () => {
    expect(paddingFor(0)).toEqual({ bottom: MARGIN, left: MARGIN, right: MARGIN, top: MARGIN })
    expect(paddingFor(300).bottom).toBe(308)
  })

  test('an anchor measured in the window moves by the host’s place and the status bar Floating UI added', () => {
    const offset = anchorOffset({ x: 0, y: 0 }, 24)
    expect(offset).toEqual({ x: 0, y: 24 })
    expect(shifted({ height: 40, width: 100, x: 16, y: 324 }, offset)).toEqual({
      height: 40,
      width: 100,
      x: 16,
      y: 300,
    })
    expect(anchorOffset({ x: 10, y: 50 }, 0)).toEqual({ x: 10, y: 50 })
  })

  test('a modal layer takes a close request alone by default, and any other a press outside too', () => {
    expect(closedByOf(undefined, true)).toBe('closerequest')
    expect(closedByOf(undefined, false)).toBe('any')
    expect(closedByOf('none', false)).toBe('none')
    expect(dismisses('any', 'outside')).toBe(true)
    expect(dismisses('closerequest', 'outside')).toBe(false)
    expect(dismisses('closerequest', 'request')).toBe(true)
    expect(dismisses('none', 'request')).toBe(false)
    expect(dismisses('closerequest', 'swipe')).toBe(true)
    expect(dismisses('none', 'swipe')).toBe(false)
  })

  test('Tab goes round the stops, and Shift with Tab goes back round', () => {
    expect(tabbed(3, 2, false)).toBe(0)
    expect(tabbed(3, 0, true)).toBe(2)
    expect(tabbed(3, -1, false)).toBe(0)
    expect(tabbed(3, -1, true)).toBe(2)
    expect(tabbed(0, -1, false)).toBe(-1)
  })

  test('a touch inside the anchor’s box is the anchor’s', () => {
    const box = [10, 20, 100, 40] as const
    expect(inside(box, 50, 40)).toBe(true)
    expect(inside(box, 50, 80)).toBe(false)
    expect(inside(undefined, 50, 40)).toBe(false)
  })

  test('a box past the window by more than a point is beyond it, and one inside is not', () => {
    const window = { height: 800, width: 390 }
    expect(beyond({ height: 44, width: 200, x: 20, y: 790 }, window)).toBe(true)
    expect(beyond({ height: 44, width: 200, x: 20, y: 700 }, window)).toBe(false)
    expect(beyond({ height: 44, width: 200, x: -10, y: 100 }, window)).toBe(true)
    expect(beyond({ height: 44, width: 200, x: 0, y: 756.5 }, window)).toBe(false)
  })
})
