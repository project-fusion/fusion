import { describe, expect, test } from 'bun:test'
import { isHidden, namesIn, toggledNames } from './hidden-series.js'

describe('a hidden-series list', () => {
  /* A heading may hold a space, so only a comma separates two names. */
  test('is split on commas and nothing else', () => {
    expect(isHidden(' Direct sales,Partner ,, ', 'Direct sales')).toBe(true)
    expect(isHidden(' Direct sales,Partner ,, ', 'sales')).toBe(false)
  })

  test('matches a name whatever its case and spacing', () => {
    expect(isHidden('Direct sales, Partner', ' partner ')).toBe(true)
    expect(isHidden('Direct sales', 'Direct')).toBe(false)
  })
})

describe('a toggle', () => {
  test('hides a shown name, at the end of the list', () => {
    expect(toggledNames('Partner', 'Direct sales')).toBe('Partner, Direct sales')
    expect(toggledNames('', 'Direct')).toBe('Direct')
  })

  test('shows a hidden one again, however it was written', () => {
    expect(toggledNames('Partner, DIRECT', 'Direct')).toBe('Partner')
  })
})

/* React hands an array to `hiddenSeries`, and the list was read as a string. */
describe('a list given as an array', () => {
  test('holds the same names as the written list', () => {
    expect(namesIn([' Direct sales ', '', 'Partner'])).toEqual(namesIn('Direct sales, Partner'))
    expect(isHidden(['Direct sales'], 'direct sales')).toBe(true)
    expect(toggledNames(['Direct sales'], 'Partner')).toBe('Direct sales, Partner')
  })
})
