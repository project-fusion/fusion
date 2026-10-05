import { describe, expect, test } from 'bun:test'
import { LEVELS, shows } from './levels.js'

describe('shows', () => {
  test('with no floor every level shows', () => {
    expect(LEVELS.every((level) => shows(level, undefined))).toBe(true)
  })

  test('a floor shows its own level and every louder one', () => {
    expect(LEVELS.filter((level) => shows(level, 'warn'))).toEqual(['warn', 'error'])
    expect(LEVELS.filter((level) => shows(level, 'info'))).toEqual(['info', 'warn', 'error'])
    expect(LEVELS.filter((level) => shows(level, 'error'))).toEqual(['error'])
  })

  test('a floor that names no level hides nothing', () => {
    expect(LEVELS.every((level) => shows(level, 'debug'))).toBe(true)
  })
})
