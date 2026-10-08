import { describe, expect, test } from 'bun:test'
import { inSequence, rectangleOf } from './rectangle.js'

/* Seven rows to a column, as a calendar: cell 9 is column 1, row 2. */
describe('a rectangle of cells', () => {
  test('takes in the rows and the columns between two corners, in the order drawn', () => {
    expect(rectangleOf(21, 7, 1, 9)).toEqual([1, 2, 8, 9])
    expect(rectangleOf(21, 7, 15, 1)).toEqual([1, 8, 15])
  })

  test('is the same cells whichever corner it is drawn from', () => {
    expect(rectangleOf(21, 7, 9, 1)).toEqual(rectangleOf(21, 7, 1, 9))
    expect(rectangleOf(21, 7, 2, 7)).toEqual([0, 1, 2, 7, 8, 9])
  })

  test('skips the places a short last column has no cell for', () => {
    // Ten cells: the second column holds three, 7 to 9.
    expect(rectangleOf(10, 7, 4, 8)).toEqual([1, 2, 3, 4, 8, 9])
  })

  test('is one cell where both corners are the same', () => {
    expect(rectangleOf(21, 7, 5, 5)).toEqual([5])
  })

  test('is a run of cells on a strip of one row', () => {
    expect(rectangleOf(6, 1, 4, 1)).toEqual([1, 2, 3, 4])
  })
})

describe('a selection in sequence', () => {
  test('lists each value once, in the order the table lists them', () => {
    expect(inSequence(['Wed', 'Mon', 'Wed', 'Tue'], ['Mon', 'Tue', 'Wed'])).toEqual([
      'Mon',
      'Tue',
      'Wed',
    ])
  })

  test('keeps a value the table no longer lists, after the rest', () => {
    expect(inSequence(['Sun', 'Tue', 'Mon'], ['Mon', 'Tue'])).toEqual(['Mon', 'Tue', 'Sun'])
  })
})
