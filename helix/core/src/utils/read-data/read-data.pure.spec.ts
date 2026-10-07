import { describe, expect, test } from 'bun:test'
import { type ChartData, rowsFromData, seriesFromData } from './read-data.js'

const CHANNELS: ChartData = {
  caption: 'Sessions by channel',
  columns: ['Month', 'Direct', 'Notes', 'Referral'],
  rows: [
    ['Jan', 1200, 'launch', { text: '$4k', value: 4000 }],
    ['Feb', null, '', '8'],
    ['Mar', 2000, 'sale', 'n/a'],
  ],
}

/* A chart could read only a table; data in the same shape reads the same way,
   so every chart drawing from `series` and `sourceRows` draws it unchanged. */
describe('data read as series', () => {
  test('one per column with numbers, a blank keeping its row, words not a number', () => {
    expect(seriesFromData(CHANNELS, 'en')).toEqual([
      {
        name: 'Direct',
        points: [
          { at: 0, label: 'Jan', value: 1200 },
          { at: 2, label: 'Mar', value: 2000 },
        ],
      },
      {
        name: 'Referral',
        points: [
          { at: 0, label: 'Jan', value: 4000 },
          { at: 1, label: 'Feb', value: 8 },
        ],
      },
    ])
  })

  test('a lone column with no heading takes the caption as its name', () => {
    const lone = seriesFromData({ caption: 'Sessions', columns: ['Month'], rows: [['Jan', 3]] })
    expect(lone.map((one) => one.name)).toEqual(['Sessions'])
  })
})

describe('data read as rows', () => {
  test('keeps every cell with its words, a number written in the locale', () => {
    const [jan, feb] = rowsFromData(CHANNELS, 'de')
    expect(jan).toEqual({
      cells: [
        { name: 'Direct', text: '1.200', value: 1200 },
        { name: 'Notes', text: 'launch' },
        { name: 'Referral', text: '$4k', value: 4000 },
      ],
      label: 'Jan',
    })
    expect(feb?.cells[0]).toEqual({ name: 'Direct', text: '' })
  })
})
