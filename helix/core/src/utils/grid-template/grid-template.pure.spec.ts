import { describe, expect, test } from 'bun:test'
import { gridTemplate } from '../derivations/derivations.js'
import { gridLength, gridTracks } from './grid-template.js'

describe('gridTracks', () => {
  test('fits as many columns as a minimum width allows, over a count', () => {
    expect(gridTracks('12rem', 3)).toBe('repeat(auto-fit, minmax(min(12rem, 100%), 1fr))')
  })

  test('lists a count above six, which the stylesheet does not', () => {
    expect(gridTracks(undefined, 8)).toBe('repeat(8, minmax(0, 1fr))')
    expect(gridTracks(undefined, '8')).toBe('repeat(8, minmax(0, 1fr))')
    expect(gridTracks(undefined, 4)).toBeUndefined()
    expect(gridTracks('', undefined)).toBeUndefined()
  })

  test('refuses a minimum that could end the rule it is written into', () => {
    expect(gridLength('1px,1fr)} :host{background:url(//x)}')).toBeUndefined()
    expect(gridTracks('1px,1fr)}', 8)).toBe('repeat(8, minmax(0, 1fr))')
    expect(gridLength('calc(10rem + 2vw)')).toBe('calc(10rem + 2vw)')
  })
})

describe('gridTemplate', () => {
  test('reads `min` and `columns` from the props', () => {
    expect(gridTemplate({ columns: 7 })).toBe('repeat(7, minmax(0, 1fr))')
    expect(gridTemplate({ min: '10rem' })).toBe('repeat(auto-fit, minmax(min(10rem, 100%), 1fr))')
    expect(gridTemplate({})).toBeUndefined()
  })
})
