import { describe, expect, test } from 'bun:test'
import { barPicture, barPixel } from './bar-picture.js'
import { barsOf } from './bars.js'
import { SPATIAL_VIEW } from './box.js'

const row = (label: string, ...values: number[]) => ({
  cells: values.map((value, at) => ({ name: `Q${at + 1}`, text: `${value} runs`, value })),
  label,
})

const week = barsOf([row('Mon', 4), row('Tue', 6), row('Wed', 5)], [0], false, (at) =>
  at === 1 ? 'primary' : undefined,
)

const ask = {
  camera: SPATIAL_VIEW,
  lang: 'en',
  noBox: false,
  room: { font: 12, height: 300, width: 300 },
  valueText: (cell: { row: number }) => `${[4, 6, 5][cell.row]} runs`,
}

describe('a bar chart’s picture', () => {
  test('a grid draws its box and no floor, and paints every bar', () => {
    const picture = barPicture(week, { ...ask, layout: 'grid' })
    expect(picture.bare).toBe(false)
    expect(picture.floor).toHaveLength(0)
    expect(picture.painted).toHaveLength(3)
  })

  test('a row draws its floor in place of the box, and names each place under it', () => {
    const picture = barPicture(week, { ...ask, layout: 'row' })
    expect(picture.bare).toBe(true)
    expect(picture.floor).toHaveLength(3)
    expect(picture.names.map((name) => name.text)).toEqual(['Mon', 'Tue', 'Wed'])
  })

  test('a toned bar’s value stands over it, and rises with it as it grows', () => {
    const full = barPicture(week, { ...ask, layout: 'row' })
    const half = barPicture(week, { ...ask, grown: () => 0.5, layout: 'row' })
    expect(full.values.map((value) => value.text)).toEqual(['6 runs'])
    expect(half.values[0]?.y ?? 0).toBeGreaterThan(full.values[0]?.y ?? 0)
  })

  test('the words are written at the box’s font size whatever the drawing’s scale', () => {
    const picture = barPicture(week, { ...ask, layout: 'row' })
    const pixel = barPixel(ask.room, picture.unit, picture.placed) ?? 0
    expect(picture.size / pixel).toBeCloseTo(12, 0)
  })
})
