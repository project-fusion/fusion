import { describe, expect, test } from 'bun:test'
import { type Branch, levelOf, nest } from './levels.js'

/** A tree written short: each index, with its children in brackets. */
const shape = (branches: Branch[]): string =>
  branches
    .map((one) =>
      one.children.length > 0 ? `${one.index}[${shape(one.children)}]` : `${one.index}`,
    )
    .join(' ')

describe('levelOf', () => {
  test('reads a whole number from 1', () => {
    expect(levelOf('2')).toBe(2)
    expect(levelOf('3')).toBe(3)
  })

  test('puts a link with no usable level at the top', () => {
    expect(levelOf(null)).toBe(1)
    expect(levelOf('')).toBe(1)
    expect(levelOf('zero')).toBe(1)
    expect(levelOf('0')).toBe(1)
  })
})

describe('nest', () => {
  test('keeps a flat run flat', () => {
    expect(shape(nest([1, 1, 1]))).toBe('0 1 2')
  })

  test('puts each deeper link under the one before it', () => {
    expect(shape(nest([1, 2, 1, 2, 1]))).toBe('0[1] 2[3] 4')
  })

  test('nests as deep as the levels go, and comes back out', () => {
    expect(shape(nest([1, 2, 3, 2, 1]))).toBe('0[1[2] 3] 4')
  })

  test('nests a jump of two levels one list deeper', () => {
    expect(shape(nest([1, 3, 3, 1]))).toBe('0[1 2] 3')
  })

  test('starts at the top whatever the first level is', () => {
    expect(shape(nest([2, 3, 2]))).toBe('0[1] 2')
    expect(shape(nest([]))).toBe('')
  })
})
