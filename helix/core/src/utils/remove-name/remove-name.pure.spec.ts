import { afterEach, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '../../words/registry.js'
import { tagRemoveName } from '../derivations/derivations.js'
import { contentWords, removeName } from './remove-name.js'

afterEach(() => {
  clearWords('de')
})

/** An element as React passes it, with what it holds. */
const element = (children: unknown) => ({ props: { children }, type: 'span' })

describe('the words of passed content', () => {
  test('read text, numbers and every element inside, with white space made one', () => {
    expect(contentWords('  Apple \n pie ')).toBe('Apple pie')
    expect(contentWords(['Plan', 3])).toBe('Plan 3')
    expect(contentWords(element(['Pro', element(' plan')]))).toBe('Pro plan')
    expect(contentWords(undefined)).toBe('')
    expect(contentWords([null, false, element(undefined)])).toBe('')
  })
})

describe('a remove button’s name', () => {
  test('puts the tag’s words, its category first, where the label writes `{label}`', () => {
    expect(removeName({ default: 'Apple' })).toBe('Remove Apple')
    expect(removeName({ default: 'High', start: element('Priority') })).toBe('Remove Priority High')
    expect(removeName({ default: 'Open', 'dismiss-label': '{label} entfernen' })).toBe(
      'Open entfernen',
    )
  })

  test('follows a label with no `{label}` with the words, unless it holds them', () => {
    expect(removeName({ default: 'Open', 'dismiss-label': 'Remove filter' })).toBe(
      'Remove filter Open',
    )
    expect(removeName({ default: 'Open', 'dismiss-label': 'Remove the Open filter' })).toBe(
      'Remove the Open filter',
    )
  })

  test('is the verb alone where the tag has no words', () => {
    expect(removeName({})).toBe('Remove')
  })

  test('reads the words registered for `helix-tag` in its locale, where none are given', () => {
    registerWords('de', { 'helix-tag': { dismissLabel: '{label} entfernen' } })
    expect(tagRemoveName({ default: 'Apfel', locale: 'de' })).toBe('Apfel entfernen')
    expect(
      tagRemoveName({ default: 'Apfel', 'dismiss-label': 'Remove {label}', locale: 'de' }),
    ).toBe('Apfel entfernen')
    expect(
      tagRemoveName({ default: 'Apfel', 'dismiss-label': 'Weg mit {label}', locale: 'de' }),
    ).toBe('Weg mit Apfel')
  })
})
