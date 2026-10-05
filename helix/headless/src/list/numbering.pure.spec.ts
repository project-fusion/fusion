import { describe, expect, test } from 'bun:test'
import { numbering } from './numbering.js'

/* Where an ordered list's numbers start and which way they run, as `<ol>`
   reads `start` and `reversed`. */

describe('numbering', () => {
  test('neither asks for the ordinary count from one', () => {
    expect(numbering(undefined, false, 4)).toBeUndefined()
  })

  test('a start counts up from it', () => {
    expect(numbering(5, false, 4)).toEqual({ first: 5, step: 1 })
    expect(numbering(0, false, undefined)).toEqual({ first: 0, step: 1 })
  })

  test('reversed counts down from the start, or from the number of rows', () => {
    expect(numbering(10, true, 4)).toEqual({ first: 10, step: -1 })
    expect(numbering(undefined, true, 4)).toEqual({ first: 4, step: -1 })
  })

  /* A server does not know how many rows there are, and counts from one. */
  test('reversed with no start and no count asks for nothing', () => {
    expect(numbering(undefined, true, undefined)).toBeUndefined()
  })

  test('a start that is not a whole number is cut to one', () => {
    expect(numbering(2.7, false, 1)).toEqual({ first: 2, step: 1 })
    expect(numbering(Number.NaN, false, 1)).toBeUndefined()
  })
})
