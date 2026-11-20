import { describe, expect, test } from 'bun:test'
import { dataOptions, windowOf } from './data-options.js'

describe('options handed over as data', () => {
  test('a value alone is its own words, as a string', () => {
    expect(dataOptions(['Rust', 7])).toEqual([
      {
        active: false,
        between: false,
        disabled: false,
        hidden: false,
        selected: false,
        text: 'Rust',
        value: 'Rust',
      },
      {
        active: false,
        between: false,
        disabled: false,
        hidden: false,
        selected: false,
        text: '7',
        value: '7',
      },
    ])
  })

  test('a record gives its label and whether it is disabled', () => {
    expect(dataOptions([{ disabled: true, label: 'Go', value: 'go' }, { value: 3 }])).toEqual([
      {
        active: false,
        between: false,
        disabled: true,
        hidden: false,
        selected: false,
        text: 'Go',
        value: 'go',
      },
      {
        active: false,
        between: false,
        disabled: false,
        hidden: false,
        selected: false,
        text: '3',
        value: '3',
      },
    ])
  })
})

describe('a record between the ends of a range', () => {
  test('says so, and only where it says so', () => {
    const [inside, outside] = dataOptions([{ between: true, value: '09:30' }, { value: '10:30' }])
    expect(inside?.between).toBe(true)
    expect(outside?.between).toBe(false)
  })
})

describe('the positions a window draws', () => {
  test('the window, held to the count', () => {
    expect(windowOf(2, 5, 10, -1)).toEqual([2, 3, 4])
    expect(windowOf(8, 14, 10, -1)).toEqual([8, 9])
    expect(windowOf(12, 14, 10, -1)).toEqual([])
  })

  test('and the kept one, before or after it where it lies outside', () => {
    expect(windowOf(2, 5, 10, 0)).toEqual([0, 2, 3, 4])
    expect(windowOf(2, 5, 10, 9)).toEqual([2, 3, 4, 9])
    expect(windowOf(2, 5, 10, 3)).toEqual([2, 3, 4])
    expect(windowOf(2, 5, 10, 10)).toEqual([2, 3, 4])
  })
})
