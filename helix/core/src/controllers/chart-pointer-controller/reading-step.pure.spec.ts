import { describe, expect, test } from 'bun:test'
import { type ReadingLayout, stepReading } from './reading-step.js'

/* The map of keys to readings every chart shares, held without a page. */
const LINE: ReadingLayout = { axis: 'inline', count: 4, grid: 1, rtl: false, series: 1 }
const NONE = { at: -1, series: -1 }

const walk = (keys: string[], layout: ReadingLayout, from = NONE) =>
  keys.reduce((place, key) => stepReading(key, place, layout) ?? place, from)

describe('a row of readings', () => {
  test('starts at the first on the arrow that moves on, and at the last on the one moving back', () => {
    expect(stepReading('ArrowRight', NONE, LINE)).toEqual({ at: 0, series: -1 })
    expect(stepReading('ArrowLeft', NONE, LINE)).toEqual({ at: 3, series: -1 })
  })

  test('walks one at a time and never off either end', () => {
    expect(walk(['ArrowRight', 'ArrowRight', 'ArrowLeft'], LINE).at).toBe(0)
    expect(walk(Array(9).fill('ArrowRight'), LINE).at).toBe(3)
  })

  test('goes to the first and the last with Home and End', () => {
    expect(stepReading('End', NONE, LINE)?.at).toBe(3)
    expect(stepReading('Home', { at: 2, series: -1 }, LINE)?.at).toBe(0)
  })

  /* The drawing is turned on a right-to-left page, so the left arrow moves on. */
  test('moves on with the left arrow on a right-to-left page', () => {
    expect(walk(['ArrowLeft', 'ArrowLeft'], { ...LINE, rtl: true }).at).toBe(1)
  })

  test('takes the up and down arrows too, where a reading holds one series', () => {
    expect(walk(['ArrowDown', 'ArrowDown'], LINE)).toEqual({ at: 1, series: -1 })
  })

  test('leaves every other key to the page', () => {
    expect(stepReading('Tab', NONE, LINE)).toBeUndefined()
    expect(stepReading('a', NONE, LINE)).toBeUndefined()
  })

  test('has nowhere to go with no readings', () => {
    expect(stepReading('ArrowRight', NONE, { ...LINE, count: 0 })).toBeUndefined()
  })
})

describe('the series of a reading', () => {
  const TWO = { ...LINE, series: 2 }

  test('are walked with up and down, and up from the first is the whole reading again', () => {
    expect(walk(['ArrowRight', 'ArrowDown'], TWO)).toEqual({ at: 0, series: 0 })
    expect(walk(['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown'], TWO).series).toBe(1)
    expect(walk(['ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowUp'], TWO).series).toBe(-1)
  })

  test('start on the first reading from none', () => {
    expect(stepReading('ArrowDown', NONE, TWO)).toEqual({ at: 0, series: 0 })
  })

  test('keep their place while the readings move', () => {
    expect(walk(['ArrowDown', 'ArrowRight'], TWO)).toEqual({ at: 1, series: 0 })
  })

  /* A horizontal bar chart runs its categories down the box. */
  test('trade arrows with the readings on a chart that runs down the box', () => {
    const DOWN = { ...TWO, axis: 'block' as const }
    expect(walk(['ArrowDown', 'ArrowDown', 'ArrowRight'], DOWN)).toEqual({ at: 1, series: 0 })
    expect(walk(['ArrowLeft'], { ...DOWN, rtl: true })).toEqual({ at: 0, series: 0 })
  })

  test('and on such a chart with one series, every arrow walks the readings', () => {
    expect(walk(['ArrowRight', 'ArrowRight'], { ...LINE, axis: 'block' }).at).toBe(1)
  })
})

describe('a grid of readings', () => {
  /* A heatmap stands a week to a column, so the across arrows move a week. */
  const WEEKS: ReadingLayout = { axis: 'inline', count: 21, grid: 7, rtl: false, series: 1 }

  test('moves a column across and a reading up and down', () => {
    expect(walk(['Home', 'ArrowRight', 'ArrowDown', 'ArrowDown'], WEEKS).at).toBe(9)
    expect(walk(['End', 'ArrowLeft'], WEEKS).at).toBe(13)
  })

  test('has no series to walk, whatever a reading holds', () => {
    expect(walk(['Home', 'ArrowDown'], { ...WEEKS, series: 3 })).toEqual({ at: 1, series: -1 })
  })
})
