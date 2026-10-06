import { describe, expect, test } from 'bun:test'
import { neighborOf } from './neighbor.js'

describe('neighborOf', () => {
  const walk = ['a', 'edge:e1', 'b', 'edge:e2', 'c']

  test('takes the first stop after the one that left that is still there', () => {
    expect(neighborOf(walk, 2, (key) => key !== 'b' && key !== 'edge:e2')).toBe('c')
  })

  test('and the nearest one before it where none after it is left', () => {
    expect(neighborOf(walk, 4, (key) => key !== 'c' && key !== 'edge:e2')).toBe('b')
  })

  test('is undefined where nothing is left', () => {
    expect(neighborOf(walk, 0, () => false)).toBeUndefined()
    expect(neighborOf([], 0, () => true)).toBeUndefined()
  })

  test('from nowhere, takes the first stop kept', () => {
    expect(neighborOf(walk, -1, (key) => key !== 'a')).toBe('edge:e1')
  })
})
