import { describe, expect, test } from 'bun:test'
import {
  anchorAt,
  commaList,
  everyState,
  inRowOrder,
  pressedValue,
  prunedValue,
  toggleEvery,
  toggleValue,
  writtenList,
  writtenNumbers,
} from './written-list.js'

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

describe('a value list', () => {
  test('is split on commas only, trimmed, its empty entries dropped', () => {
    expect(commaList(' New York, ,Paris ,')).toEqual(['New York', 'Paris'])
    expect(commaList('2026-08-04, 2026-08-05')).toEqual(['2026-08-04', '2026-08-05'])
    expect(commaList('')).toEqual([])
    expect(commaList(' , ')).toEqual([])
  })
})

describe('a value toggled in a list', () => {
  test('is added at the end, or taken out', () => {
    expect(toggleValue(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(toggleValue([], 'a')).toEqual(['a'])
  })

  test('takes out every copy, and leaves the list it was given alone', () => {
    const list = ['a', 'b', 'a']
    expect(toggleValue(list, 'a')).toEqual(['b'])
    expect(list).toEqual(['a', 'b', 'a'])
  })

  test('in a given order, keeping only what the order holds', () => {
    const order = ['bold', 'italic', 'underline']
    expect(toggleValue(['underline'], 'bold', order)).toEqual(['bold', 'underline'])
    expect(toggleValue(['underline', 'bold'], 'underline', order)).toEqual(['bold'])
    expect(toggleValue(['gone'], 'italic', order)).toEqual(['italic'])
  })
})

describe('a press on an item in a set that selects', () => {
  test('in a single selection selects it alone, and again selects none', () => {
    expect(pressedValue('single', 'a', 'b')).toBe('b')
    expect(pressedValue('single', 'b', 'b')).toBe('')
  })

  /* A value with a space in it is one value: Tag Group's case. */
  test('in a multiple selection adds it, and again takes it out', () => {
    expect(pressedValue('multiple', 'a', 'b c')).toBe('a, b c')
    expect(pressedValue('multiple', 'a, b c', 'a')).toBe('b c')
  })

  test('selects nothing where the set selects nothing', () => {
    expect(pressedValue('none', 'a', 'b')).toBe('a')
  })
})

describe('an item that leaves a set', () => {
  test('takes its value out where no item left stands for it', () => {
    expect(prunedValue('a, b c', 'b c', ['a'])).toBe('a')
  })

  test('keeps it where another item still stands for it', () => {
    expect(prunedValue('a, b', 'b', ['a', 'b'])).toBe('a, b')
  })

  test('leaves a value that never held it as written', () => {
    expect(prunedValue('a,b', 'c', [])).toBe('a,b')
  })
})

describe('every one of a set at once', () => {
  test('is added where any was missing, after what was chosen', () => {
    expect(toggleEvery(['x', 'b'], ['a', 'b', 'c'])).toEqual(['x', 'b', 'a', 'c'])
  })

  test('and taken out where every one was in', () => {
    expect(toggleEvery(['a', 'x', 'b'], ['a', 'b'])).toEqual(['x'])
  })

  test('in an order, holding only what the order holds', () => {
    expect(toggleEvery(['c'], ['a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(toggleEvery(['z', 'a'], ['a'], ['a', 'b'])).toEqual([])
  })

  test('changes nothing for an empty set', () => {
    expect(toggleEvery(['a'], [])).toEqual(['a'])
  })
})

/* Checkbox Group's select-all box and Table's and Data Table's header boxes. */
describe('everyState', () => {
  test('is checked when every value is chosen', () => {
    expect(everyState(['a', 'b', 'c'], ['a', 'b'])).toEqual({ checked: true, indeterminate: false })
  })

  test('is mixed when some are', () => {
    expect(everyState(['a'], ['a', 'b'])).toEqual({ checked: false, indeterminate: true })
  })

  test('is neither for none, or for an empty set', () => {
    expect(everyState([], ['a', 'b'])).toEqual({ checked: false, indeterminate: false })
    expect(everyState(['a'], [])).toEqual({ checked: false, indeterminate: false })
  })
})

/* Data Table wrote these, and Table and Virtual List needed them too. */
describe('a selection in row order', () => {
  test('follows the rows, whatever order the keys were chosen in', () => {
    expect(inRowOrder(['c', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'c'])
  })

  test('keeps a key the rows do not hold, after them', () => {
    expect(inRowOrder(['hidden', 'b'], ['a', 'b'])).toEqual(['b', 'hidden'])
  })
})

describe('where a Shift range runs from', () => {
  test('is the row last chosen while it is on the page', () => {
    expect(anchorAt(['a', 'b', 'c'], 'b', 2)).toEqual({ anchor: 1, anchorKey: 'b' })
  })

  test('or the row the reader is on, which becomes the one to run from', () => {
    expect(anchorAt(['a', 'b', 'c'], 'gone', 2)).toEqual({ anchor: 2, anchorKey: 'c' })
    expect(anchorAt(['a', 'b'], undefined, 0)).toEqual({ anchor: 0, anchorKey: 'a' })
  })
})
