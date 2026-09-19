import { describe, expect, test } from 'bun:test'
import { splitValues } from './split-values.js'

/**
 * The same trap from both separators.
 *
 * A naive split leaves fragments that are not values, and both properties that
 * take a list draw something rather than failing: a swatch row short by one, a
 * grid down to a single column. Neither says anything.
 */
describe('a list of values split on its commas', () => {
  test('a comma inside a legacy color is not a separator', () => {
    expect(splitValues('#ef4444, rgb(249 115 22), rgba(34,197,94,.5)', ',')).toEqual([
      '#ef4444',
      'rgb(249 115 22)',
      'rgba(34,197,94,.5)',
    ])
  })

  test('each value comes back trimmed, since the space around it is not part of it', () => {
    expect(splitValues('  red ,  blue  ', ',')).toEqual(['red', 'blue'])
  })

  test('an empty value is dropped rather than parsed as one nobody wrote', () => {
    expect(splitValues(',red,,blue,', ',')).toEqual(['red', 'blue'])
    expect(splitValues('', ',')).toEqual([])
    expect(splitValues('   ', ',')).toEqual([])
  })
})

describe('a track list split on its spaces', () => {
  test('a space inside a function is not a separator', () => {
    expect(splitValues('minmax(0, 1fr) 8rem', ' ')).toEqual(['minmax(0, 1fr)', '8rem'])
  })

  test('nesting is counted, so a calc inside a minmax is still one track', () => {
    expect(splitValues('minmax(0, calc(1px + 1%)) auto', ' ')).toEqual([
      'minmax(0, calc(1px + 1%))',
      'auto',
    ])
  })

  test('a line name is its own value, brackets counted like parentheses', () => {
    expect(splitValues('[full start] 1fr [main] 2fr', ' ')).toEqual([
      '[full start]',
      '1fr',
      '[main]',
      '2fr',
    ])
  })

  test('runs of whitespace separate once, newlines and tabs included', () => {
    expect(splitValues('1fr\n  2fr\t3fr', ' ')).toEqual(['1fr', '2fr', '3fr'])
  })
})
