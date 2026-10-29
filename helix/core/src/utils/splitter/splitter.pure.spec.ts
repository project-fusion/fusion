import { describe, expect, test } from 'bun:test'
import { splitterName } from '../derivations/derivations.js'
import {
  snapTo,
  splitterBounds,
  splitterClamp,
  splitterPercent,
  splitterShutAt,
  splitterSliver,
  splitterSnaps,
  splitterTravel,
} from './splitter.js'

describe('snapTo', () => {
  test('lands on the nearest point within the threshold', () => {
    expect(snapTo(48, [25, 50, 75], 3)).toBe(50)
    expect(snapTo(27, [25, 50, 75], 3)).toBe(25)
  })

  test('stays where the pointer is beyond every threshold', () => {
    expect(snapTo(40, [25, 50, 75], 3)).toBe(40)
    expect(snapTo(40, [], 3)).toBe(40)
  })

  test('takes the nearer of two points in reach, and the first on a tie', () => {
    expect(snapTo(51, [48, 52], 5)).toBe(52)
    expect(snapTo(50, [48, 52], 5)).toBe(48)
  })
})

describe('splitter arithmetic', () => {
  test('reads a bound as a percentage, or a length against the split', () => {
    expect(splitterPercent(20, 0, 400, 16)).toBe(20)
    expect(splitterPercent('30', 0, 400, 16)).toBe(30)
    expect(splitterPercent('100px', 0, 400, 16)).toBe(25)
    expect(splitterPercent('5rem', 0, 400, 16)).toBe(20)
    expect(splitterPercent('5rem', 7, 0, 16)).toBe(7)
    expect(splitterPercent('wide', 7, 400, 16)).toBe(7)
  })

  test("holds the divider between its bounds and short of the end pane's least", () => {
    const bounds = splitterBounds(20, 90, 25)
    expect(bounds).toEqual({ max: 75, min: 20 })
    expect(splitterClamp(10, bounds)).toBe(20)
    expect(splitterClamp(80, bounds)).toBe(75)
    expect(splitterClamp(Number.NaN, bounds)).toBe(20)
  })

  test('shuts the pane a position reaches, where it may shut', () => {
    expect(splitterShutAt(0, 0, undefined)).toBe('start')
    expect(splitterShutAt(100, 0, 'both')).toBe('end')
    expect(splitterShutAt(92, 8, undefined)).toBe('end')
    expect(splitterShutAt(0, 0, 'end')).toBeUndefined()
    expect(splitterShutAt(50, 0, undefined)).toBeUndefined()
    expect(splitterSliver('8')).toBe(8)
    expect(splitterSliver(140)).toBe(100)
  })

  test('moves a divider the way the arrow points', () => {
    expect(splitterTravel('ArrowRight', false, false)).toBe(1)
    expect(splitterTravel('ArrowLeft', false, true)).toBe(1)
    expect(splitterTravel('ArrowDown', false, false)).toBe(0)
    expect(splitterTravel('ArrowDown', true, false)).toBe(1)
    expect(splitterTravel('ArrowUp', true, false)).toBe(-1)
  })

  test('reads snap places as percentages', () => {
    expect(splitterSnaps('25, 50, 100px', 400, 16)).toEqual([25, 50, 25])
    expect(splitterSnaps(undefined, 400, 16)).toEqual([])
  })

  test('names the divider by its label, or its fallback', () => {
    expect(splitterName({ 'fallback-label': 'Resize panes', label: '' })).toBe('Resize panes')
    expect(splitterName({ 'fallback-label': 'Resize panes', label: 'Sidebar' })).toBe('Sidebar')
  })
})
