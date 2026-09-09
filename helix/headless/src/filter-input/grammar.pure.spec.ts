import { describe, expect, test } from 'bun:test'
import { DEFAULT_FILTER_OPERATORS, type FilterGrammarField, readFilterText } from './grammar.js'

/* What a reader typed, against what a consumer declared.
 *
 * Every case here is a sentence somebody types into a box, and the thing worth
 * checking about each is which half of it became a filter and which half stayed
 * text. A picture of the field shows one chip either way.
 */

/** Declares no comparisons, so it is offered the two the punctuation can say. */
const DISPOSITION: FilterGrammarField = {
  label: 'Disposition',
  name: 'disposition',
  operators: DEFAULT_FILTER_OPERATORS,
  values: [
    { label: 'Refunded', value: 'refunded' },
    { label: 'Charged back', value: 'chargeback' },
    { label: 'Settled', value: 'settled' },
  ],
}

/** The scalar shape: one comparison, no default, and no negation to type. */
const CREATED: FilterGrammarField = {
  label: 'Created',
  name: 'created',
  operators: [{ default: false, label: 'is after', name: 'after' }],
  values: [],
}

const FIELDS = [DISPOSITION, CREATED]

const read = (text: string) => readFilterText(text, FIELDS)

describe('what a field is written as', () => {
  test('the name, and the whole term goes out of the text', () => {
    const { terms, text } = read('disposition:refunded')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.facet.field).toBe('disposition')
    expect(terms[0]?.facet.values).toEqual(['refunded'])
    expect(text).toBe('')
  })

  test('the label, and either spelling of it', () => {
    expect(read('Disposition:refunded').terms).toHaveLength(1)
    expect(read('DISPOSITION:refunded').terms).toHaveLength(1)
  })

  test('anything not declared is left alone', () => {
    const { terms, text } = read('assignee:ada')
    expect(terms).toHaveLength(0)
    expect(text).toBe('assignee:ada')
  })
})

describe('what a value is written as', () => {
  test('its own name or the words it is shown under', () => {
    expect(read('disposition:chargeback').terms[0]?.facet.values).toEqual(['chargeback'])
    expect(read('disposition:"charged back"').terms[0]?.facet.values).toEqual(['chargeback'])
  })

  test('a comma is a set, and a repeat is not two of it', () => {
    expect(read('disposition:refunded,settled').terms[0]?.facet.values).toEqual([
      'refunded',
      'settled',
    ])
    expect(read('disposition:refunded,refunded').terms[0]?.facet.values).toEqual(['refunded'])
  })

  test('a value the field never declared leaves the whole term as text', () => {
    const { terms, text } = read('disposition:reufnded')
    expect(terms).toHaveLength(0)
    expect(text).toBe('disposition:reufnded')
  })

  test('a field that declares none takes whatever was typed', () => {
    expect(read('created:2026-08-01').terms[0]?.facet.values).toEqual(['2026-08-01'])
  })
})

describe('the comparison', () => {
  test('the default is the one nobody needs told, so the chip leaves it unwritten', () => {
    const facet = read('disposition:refunded').terms[0]?.facet
    expect(facet?.operator).toBe('any')
    expect(facet?.operatorLabel).toBe('')
  })

  test('a leading minus asks for the one named none', () => {
    const facet = read('-disposition:refunded').terms[0]?.facet
    expect(facet?.operator).toBe('none')
    expect(facet?.operatorLabel).toBe('is none of')
  })

  test('a field with no none has no negation, and the term stays text', () => {
    const { terms, text } = read('-created:today')
    expect(terms).toHaveLength(0)
    expect(text).toBe('-created:today')
  })

  test('a field with one undefaulted comparison uses it, and the chip says it', () => {
    const facet = read('created:today').terms[0]?.facet
    expect(facet?.operator).toBe('after')
    expect(facet?.operatorLabel).toBe('is after')
  })
})

describe('a line with more than one thing in it', () => {
  test('two terms for one field merge, and the text keeps neither', () => {
    const { terms, text } = read('disposition:refunded disposition:settled')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.facet.values).toEqual(['refunded', 'settled'])
    expect(terms[0]?.written).toEqual(['disposition:refunded', 'disposition:settled'])
    expect(text).toBe('')
  })

  test('a second comparison for one field has no event to arrive in, so it stays text', () => {
    const { terms, text } = read('disposition:refunded -disposition:settled')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.facet.operator).toBe('any')
    expect(text).toBe('-disposition:settled')
  })

  test('two fields are two terms, in the order they were written', () => {
    const { terms } = read('created:today disposition:refunded')
    expect(terms.map((term) => term.facet.field)).toEqual(['created', 'disposition'])
  })

  test('a search and a filter at once, and the search survives', () => {
    const { terms, text } = read('refund tuesday disposition:settled')
    expect(terms).toHaveLength(1)
    expect(text).toBe('refund tuesday')
  })

  test('quotes hold a space together rather than splitting the line', () => {
    const { terms, text } = read('created:"last tuesday" refund')
    expect(terms[0]?.facet.values).toEqual(['last tuesday'])
    expect(text).toBe('refund')
  })
})

describe('what is not a term at all', () => {
  test('a colon with nothing before it', () => {
    expect(read(':refunded').text).toBe(':refunded')
  })

  test('a field with nothing after it', () => {
    expect(read('disposition:').text).toBe('disposition:')
  })

  test('an empty box', () => {
    expect(read('')).toEqual({ terms: [], text: '' })
  })
})
