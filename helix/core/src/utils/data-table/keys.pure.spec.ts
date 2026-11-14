import { describe, expect, test } from 'bun:test'
import { toggledOpen } from './keys.js'

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
