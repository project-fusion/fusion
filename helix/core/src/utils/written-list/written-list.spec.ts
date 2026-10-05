import { describe, expect, test } from 'bun:test'
import { writtenList, writtenNumbers } from './written-list.js'

/**
 * A list a consumer wrote into an attribute.
 *
 * The case that matters is the one that used to be silent: a reader listing
 * words puts commas between them, and a split on whitespace alone leaves the
 * comma stuck to the word, which then matches no control, no column and no
 * series.
 */
describe('how a consumer writes a list', () => {
  test('spaces, which is what the attributes shipped with', () => {
    expect(writtenList('previous next')).toEqual(['previous', 'next'])
  })

  test('commas, which is what a reader writing words reaches for', () => {
    expect(writtenList('previous,next')).toEqual(['previous', 'next'])
  })

  test('and both, which is the spelling that used to drop the first one', () => {
    expect(writtenList('previous, next')).toEqual(['previous', 'next'])
    expect(writtenList('speed, pip, download')).toEqual(['speed', 'pip', 'download'])
  })

  test('leading and trailing separators leave no empty entries behind', () => {
    expect(writtenList('  , one ,, two,  ')).toEqual(['one', 'two'])
  })

  /* React 19 sets a property, so `values={[1, 2]}` arrives as an array, and
     splitting it as a string threw inside the render. */
  test('an array a framework assigned to the property, entry by entry', () => {
    expect(writtenList(['speed', 'pip'])).toEqual(['speed', 'pip'])
    expect(writtenNumbers([1240, 1318, '7'])).toEqual([1240, 1318, 7])
  })

  test('nothing written is no list, rather than one empty name', () => {
    expect(writtenList('')).toEqual([])
    expect(writtenList('   ')).toEqual([])
    expect(writtenList(undefined)).toEqual([])
  })

  test('the order written is the order kept, since these lists are arrangements', () => {
    expect(writtenList('c a b')).toEqual(['c', 'a', 'b'])
  })
})

/**
 * The same list read as numbers.
 *
 * What a comparison must never see is `NaN`: it is false against every bound,
 * so a mistyped threshold would color cells by a rule no reader can see.
 */
describe('the same list read as numbers', () => {
  test('commas or spaces, either way', () => {
    expect(writtenNumbers('0, 1,3  6')).toEqual([0, 1, 3, 6])
  })

  test('nonsense is dropped rather than becoming NaN in a comparison', () => {
    expect(writtenNumbers('0, x, 3')).toEqual([0, 3])
  })

  test('so is an infinity, which is not a bound, a reading or a rate', () => {
    expect(writtenNumbers('1, Infinity, 2')).toEqual([1, 2])
  })

  test('negative and fractional numbers are numbers', () => {
    expect(writtenNumbers('-1, 0.5, 2e3')).toEqual([-1, 0.5, 2000])
  })

  test('an empty list is empty rather than one NaN', () => {
    expect(writtenNumbers('')).toEqual([])
    expect(writtenNumbers('  ')).toEqual([])
    expect(writtenNumbers(undefined)).toEqual([])
  })

  test('the order written is the order kept, since a threshold list is read in it', () => {
    expect(writtenNumbers('6 3 1 0')).toEqual([6, 3, 1, 0])
  })
})
