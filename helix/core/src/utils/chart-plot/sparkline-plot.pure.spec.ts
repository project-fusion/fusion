import { describe, expect, test } from 'bun:test'
import { readingAt, readingPosition, seriesOfRows } from './chart-reading.js'
import {
  areaPath,
  overviewWords,
  readingWords,
  slotsOf,
  sparklineMarks,
  sparklinePlot,
} from './sparkline-plot.js'

describe('a reading in words', () => {
  test('is the row, the reading and where it stands', () => {
    expect(readingWords('Mon', '12', '3 of 7')).toBe('Mon: 12 (3 of 7)')
  })

  test('is the reading alone where no row names it, and no position where none is given', () => {
    expect(readingWords('', '1,318', '')).toBe('1,318')
  })

  test('is the row alone where its cell is blank', () => {
    expect(readingWords('Tue', '', '2 of 7')).toBe('Tue (2 of 7)')
  })
})

describe('the readings in their places', () => {
  test('put each value at its place, with a blank where none was read', () => {
    expect(
      slotsOf(
        [
          { at: 0, value: 4 },
          { at: 2, value: 6 },
          { at: 9, value: 1 },
        ],
        3,
      ),
    ).toEqual([4, undefined, 6])
  })
})

describe('the wash under the line', () => {
  test('closes each run down to the floor', () => {
    expect(
      areaPath(
        [
          {
            path: 'M0,4L10,2',
            run: [
              [0, 4],
              [10, 2],
            ],
          },
          {
            path: 'M30,1L40,3',
            run: [
              [30, 1],
              [40, 3],
            ],
          },
        ],
        32,
      ),
    ).toBe('M0,4L10,2L10,32L0,32ZM30,1L40,3L40,32L30,32Z')
  })

  test('is nothing without a run', () => {
    expect(areaPath([], 32)).toBe('')
  })
})

describe('what the readings come to', () => {
  const words = (slots: (number | undefined)[]) =>
    overviewWords(
      ({ first, high, last, low }) => `From ${first} to ${last}, highest ${high}, lowest ${low}`,
      slots,
      (at) => String(slots[at]),
    )

  test('says the first, the last, the highest and the lowest reading', () => {
    expect(words([undefined, 12, 30, 8, 20])).toBe('From 12 to 20, highest 30, lowest 8')
  })

  test('says nothing of a single reading', () => {
    expect(words([undefined, 5, undefined])).toBe('')
  })
})

describe('what a sparkline draws', () => {
  const series = (values: (number | undefined)[]) => ({
    name: '',
    points: values.flatMap((value, at) => (value === undefined ? [] : [{ at, label: '', value }])),
  })

  test('draws a line and its wash over the readings, ending at the last', () => {
    const drawn = sparklinePlot({ count: 3, curve: 'straight', series: series([0, 10, 5]) })
    expect(drawn.line).toBe('M0,32L50,0L100,16')
    expect(drawn.area).toBe('M0,32L50,0L100,16L100,32L0,32Z')
    expect(drawn.terminus).toEqual({ x: 100, y: 50 })
    expect(drawn.bars).toEqual([])
  })

  test('draws a column per reading from zero, and no line, under a bar plot', () => {
    const drawn = sparklinePlot({ count: 2, plot: 'bar', series: series([5, 10]) })
    expect(drawn.line).toBe('')
    expect(drawn.bars.map((one) => [one.height, one.width, Math.round(one.x), one.y])).toEqual([
      [16, 36, 7, 16],
      [32, 36, 57, 0],
    ])
    expect(drawn.place(1, 10)).toEqual({ x: 75, y: 0 })
  })

  test('marks a reading no line reaches, and no wash under a bare line', () => {
    const drawn = sparklinePlot({
      count: 5,
      curve: 'straight',
      plot: 'line',
      series: series([1, 2, undefined, 3, undefined]),
    })
    expect(drawn.area).toBe('')
    expect(drawn.lone).toEqual([{ x: 75, y: 0 }])
  })

  test('stretches the scale to hold a band', () => {
    const drawn = sparklinePlot({ band: [0, 20], count: 2, series: series([5, 10]) })
    expect(drawn.band).toEqual({ height: 32, y: 0 })
  })

  test('marks the highest and the lowest where they are asked for', () => {
    const drawn = sparklinePlot({ count: 3, curve: 'straight', series: series([0, 10, 5]) })
    expect(sparklineMarks(drawn, ['high'])).toEqual({ high: { x: 50, y: 0 } })
    expect(sparklineMarks(drawn, [])).toEqual({})
  })
})

describe('the reading a finger is on', () => {
  test('is the slot the finger stands in, held to the ends', () => {
    expect(readingAt(0, 7)).toBe(0)
    expect(readingAt(0.5, 7)).toBe(3)
    expect(readingAt(1, 7)).toBe(6)
    expect(readingAt(-0.2, 7)).toBe(0)
    expect(readingAt(0.5, 0)).toBe(-1)
  })

  test('says where it stands among the readings', () => {
    expect(readingPosition('{position} of {count}', 2, 7, String)).toBe('3 of 7')
    expect(readingPosition('', 2, 7, String)).toBe('')
  })
})

describe("a table's rows as series", () => {
  test('are a series for each column of numbers, each point at its row', () => {
    const rows = [
      { cells: [{ name: '', text: '4', value: 4 }], label: 'Sat' },
      { cells: [{ name: '', text: '' }], label: 'Sun' },
      { cells: [{ name: '', text: '12', value: 12 }], label: 'Mon' },
    ]
    expect(seriesOfRows(rows, 'Deploys')).toEqual([
      {
        name: 'Deploys',
        points: [
          { at: 0, label: 'Sat', value: 4 },
          { at: 2, label: 'Mon', value: 12 },
        ],
      },
    ])
  })
})
