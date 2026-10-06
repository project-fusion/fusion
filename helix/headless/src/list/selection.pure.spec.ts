import { describe, expect, test } from 'bun:test'
import { choiceValue, pageReach, rowStop } from './selection.js'

describe('Left and Right inside a row', () => {
  test('move from the cell through the controls and back to the cell', () => {
    expect(rowStop(3, 0, 1)).toBe(1)
    expect(rowStop(3, 1, 1)).toBe(2)
    expect(rowStop(3, 2, 1)).toBe(0)
  })

  test('back from the cell reaches the last control', () => {
    expect(rowStop(3, 0, -1)).toBe(2)
    expect(rowStop(3, 2, -1)).toBe(1)
  })

  test('a row with no controls stays on its cell', () => {
    expect(rowStop(1, 0, 1)).toBe(0)
    expect(rowStop(1, 0, -1)).toBe(0)
  })
})

describe('what a press or a key leaves selected', () => {
  const shown = ['a', 'b', 'c', 'd', 'e']
  const base = { behavior: 'toggle', mode: 'multiple', shown, value: '' } as const

  test('Shift takes in every row from the anchor, after what was selected', () => {
    expect(choiceValue({ ...base, anchor: 'b', extend: true, pressed: 'd', value: 'e' })).toBe(
      'e, b, c, d',
    )
    expect(choiceValue({ ...base, anchor: 'd', arrived: true, extend: true, pressed: 'b' })).toBe(
      'b, c, d',
    )
    // No anchor takes in the row alone, and nothing new changes nothing.
    expect(choiceValue({ ...base, extend: true, pressed: 'c' })).toBe('c')
    expect(choiceValue({ ...base, anchor: 'a', extend: true, pressed: 'b', value: 'a, b' })).toBe(
      null,
    )
  })

  test('toggle adds or takes out a pressed row, and a key only moves', () => {
    expect(choiceValue({ ...base, pressed: 'c', value: 'a' })).toBe('a, c')
    expect(choiceValue({ ...base, pressed: 'a', value: 'a, c' })).toBe('c')
    expect(choiceValue({ ...base, arrived: true, pressed: 'c', value: 'a' })).toBe(null)
  })

  test('replace selects the row alone, by a press or a key', () => {
    const replace = { ...base, behavior: 'replace' } as const
    expect(choiceValue({ ...replace, pressed: 'c', value: 'a, b' })).toBe('c')
    expect(choiceValue({ ...replace, arrived: true, pressed: 'd', value: 'c' })).toBe('d')
    expect(choiceValue({ ...replace, pressed: 'c', value: 'c' })).toBe(null)
  })

  test('replace with Control or Command toggles a press and leaves a key alone', () => {
    const replace = { ...base, behavior: 'replace', toggle: true } as const
    expect(choiceValue({ ...replace, pressed: 'c', value: 'a' })).toBe('a, c')
    expect(choiceValue({ ...replace, arrived: true, pressed: 'c', value: 'a' })).toBe(null)
  })

  test('a single list ignores Shift, and a list that selects nothing changes nothing', () => {
    expect(
      choiceValue({ ...base, anchor: 'a', extend: true, mode: 'single', pressed: 'c', value: 'a' }),
    ).toBe('c')
    expect(choiceValue({ ...base, mode: 'none', pressed: 'c' })).toBe(null)
  })
})

describe('Page Up and Page Down', () => {
  /* Ten rows of 20 pixels, then one of 100. */
  const rows = [
    ...Array.from({ length: 10 }, (_, at) => ({ bottom: at * 20 + 20, top: at * 20 })),
    { bottom: 300, top: 200 },
  ]

  test('move by the rows that fit in the box, less one, where rows are one height', () => {
    expect(pageReach(rows, 0, 100, 1)).toBe(4)
    expect(pageReach(rows, 9, 100, -1)).toBe(5)
  })

  test('measure each row, so a tall one counts for its height', () => {
    expect(pageReach(rows, 8, 100, 1)).toBe(9)
    expect(pageReach(rows, 10, 140, -1)).toBe(8)
  })

  test('move at least one row, even past one taller than the box', () => {
    expect(pageReach(rows, 9, 50, 1)).toBe(10)
    expect(pageReach(rows, 10, 50, -1)).toBe(9)
  })

  test('stay put at either end and for a row that is not there', () => {
    expect(pageReach(rows, 10, 100, 1)).toBe(10)
    expect(pageReach(rows, 0, 100, -1)).toBe(0)
    expect(pageReach([], 0, 100, 1)).toBe(0)
  })
})
