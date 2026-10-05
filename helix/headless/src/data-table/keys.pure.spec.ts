import { describe, expect, test } from 'bun:test'
import { anchorAt, inRowOrder, toggledOpen } from './keys.js'

describe('inRowOrder', () => {
  test('writes the keys in the order of the rows, whatever order they were chosen in', () => {
    expect(
      inRowOrder(['echo', 'charlie', 'alpha'], ['alpha', 'bravo', 'charlie', 'delta', 'echo']),
    ).toEqual(['alpha', 'charlie', 'echo'])
  })

  test('keeps a key the result does not hold after them', () => {
    expect(inRowOrder(['zulu', 'bravo'], ['alpha', 'bravo'])).toEqual(['bravo', 'zulu'])
  })
})

describe('toggledOpen', () => {
  const order = ['src', 'src/lib', 'docs', 'my notes']

  test('opens and closes a row, in row order', () => {
    expect(toggledOpen('docs', 'src', true, order)).toBe('src,docs')
    expect(toggledOpen('src,docs', 'src', false, order)).toBe('docs')
  })

  test('says nothing changed for a row already that way', () => {
    expect(toggledOpen('src', 'src', true, order)).toBeUndefined()
    expect(toggledOpen('', 'src', false, order)).toBeUndefined()
  })

  test('takes a key that holds a space', () => {
    expect(toggledOpen('', 'my notes', true, order)).toBe('my notes')
    expect(toggledOpen('my notes', 'my notes', true, order)).toBeUndefined()
  })
})

describe('anchorAt', () => {
  test('runs from the row last chosen while it is on the page', () => {
    expect(anchorAt(['a', 'b', 'c'], 'c', 0)).toEqual({ anchor: 2, anchorKey: 'c' })
  })

  test('runs from the row the reader is on otherwise, and makes it the anchor', () => {
    expect(anchorAt(['a', 'b', 'c'], 'z', 1)).toEqual({ anchor: 1, anchorKey: 'b' })
    expect(anchorAt(['a', 'b', 'c'], undefined, 0)).toEqual({ anchor: 0, anchorKey: 'a' })
  })
})
