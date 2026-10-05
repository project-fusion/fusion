import { describe, expect, test } from 'bun:test'
import { countLabel } from './count-label.js'

describe('countLabel', () => {
  test('takes the sentence for one thing only where the language says one', () => {
    expect(countLabel(1, '{count} result', '{count} results', 'en-US')).toBe('1 result')
    expect(countLabel(0, '{count} result', '{count} results', 'en-US')).toBe('0 results')
    expect(countLabel(3, '{count} result', '{count} results', 'en-US')).toBe('3 results')
  })

  test('draws the line where the language draws it', () => {
    /* French counts zero as one, which English does not. */
    expect(countLabel(0, '{count} résultat', '{count} résultats', 'fr-FR')).toBe('0 résultat')
  })

  test('writes the number for the locale', () => {
    expect(countLabel(1200, '{count} Treffer', '{count} Treffer', 'de-DE')).toBe('1.200 Treffer')
  })
})
