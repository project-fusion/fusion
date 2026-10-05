import { describe, expect, test } from 'bun:test'
import { choiceValue, pressedValue, rowStop } from './selection.js'

describe('what a press leaves selected', () => {
  test('single selects the row alone, and a second press lets it go', () => {
    expect(pressedValue('single', 'a', 'b')).toBe('b')
    expect(pressedValue('single', 'b', 'b')).toBe('')
  })

  test('multiple adds the row, and takes it out again', () => {
    expect(pressedValue('multiple', 'a', 'b')).toBe('a, b')
    expect(pressedValue('multiple', 'a, b', 'a')).toBe('b')
  })

  test('none selects nothing', () => {
    expect(pressedValue('none', 'a', 'b')).toBe('a')
  })
})

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
