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

describe('countLabel with a plural message', () => {
  test('lets the second sentence hold every form, where the first is empty', () => {
    const forms = '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}'
    expect(countLabel(1, '', forms, 'pl')).toBe('1 wynik')
    expect(countLabel(2, '', forms, 'pl')).toBe('2 wyniki')
    expect(countLabel(5, '', forms, 'pl')).toBe('5 wyników')
  })

  test('takes the first sentence for one where it is written', () => {
    expect(countLabel(1, 'One left', '{count, plural, other {# left}}', 'en')).toBe('One left')
  })
})
