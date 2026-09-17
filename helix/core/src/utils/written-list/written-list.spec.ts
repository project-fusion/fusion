import { describe, expect, test } from 'bun:test'
import { writtenList } from './written-list.js'

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

  test('nothing written is no list, rather than one empty name', () => {
    expect(writtenList('')).toEqual([])
    expect(writtenList('   ')).toEqual([])
    expect(writtenList(undefined)).toEqual([])
  })

  test('the order written is the order kept, since these lists are arrangements', () => {
    expect(writtenList('c a b')).toEqual(['c', 'a', 'b'])
  })
})
