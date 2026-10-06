import { describe, expect, test } from 'bun:test'
import { fillTemplate } from '../utils/fill-template/fill-template.js'
import { formatMessage } from './message.js'

describe('a message with values', () => {
  test('puts each value where the sentence says, in any order', () => {
    expect(formatMessage('{count} de {index}', { count: 'cinq', index: 'deux' }, 'fr')).toBe(
      'cinq de deux',
    )
    expect(formatMessage('{name}, then {name}', { name: 'Plan' }, 'en')).toBe('Plan, then Plan')
  })

  test('leaves a placeholder with no value as written', () => {
    expect(formatMessage('{from} to {to}', { from: 'Plan' }, 'en')).toBe('Plan to {to}')
  })

  test('writes a number in the locale', () => {
    expect(formatMessage('{count} Treffer', { count: 1200 }, 'de-DE')).toBe('1.200 Treffer')
    expect(formatMessage('{count} results', { count: 1200 }, 'en-US')).toBe('1,200 results')
  })

  test('writes a number argument in its style', () => {
    expect(formatMessage('{p, number, percent} complete', { p: 0.5 }, 'en-US')).toBe('50% complete')
    expect(formatMessage('{p, number, percent}', { p: 0.5 }, 'fr-FR')).toBe('50 %')
    expect(formatMessage('{p, number, percent}', { p: 0.5 }, 'tr')).toBe('%50')
    expect(formatMessage('{n, number, integer}', { n: 2.6 }, 'en-US')).toBe('3')
  })

  test('puts a value in as written, dollar signs and all', () => {
    expect(formatMessage('Remove {name}', { name: 'Tier $$ and $&' }, 'en')).toBe(
      'Remove Tier $$ and $&',
    )
  })

  test('writes every one of the old templates as `fillTemplate` did', () => {
    const templates = [
      'Sorted by {column}, {order}',
      'Remove {name}',
      '{name} moved to position {position} of {count}',
      'Skip to page {page}',
      'Page {page} of {pages}',
      '{from}-{to} of {total}',
      '{author} is typing',
    ]
    const values = {
      author: 'Ana',
      column: 'Name',
      count: 'ten',
      from: 'one',
      name: 'Draft',
      order: 'ascending',
      page: 'two',
      pages: 'nine',
      position: 'three',
      to: 'five',
      total: 'many',
    }
    for (const template of templates) {
      expect(formatMessage(template, values, 'en')).toBe(fillTemplate(template, values))
    }
  })
})

describe('a plural message', () => {
  const results = '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}'

  test('takes every form a language has', () => {
    expect(formatMessage(results, { count: 1 }, 'pl')).toBe('1 wynik')
    expect(formatMessage(results, { count: 2 }, 'pl')).toBe('2 wyniki')
    expect(formatMessage(results, { count: 5 }, 'pl')).toBe('5 wyników')
    expect(formatMessage(results, { count: 22 }, 'pl')).toBe('22 wyniki')
    expect(formatMessage(results, { count: 1.5 }, 'pl')).toBe('1,5 wyniku')
  })

  test('takes all six Arabic forms', () => {
    const forms = '{n, plural, zero {zero} one {one} two {two} few {few} many {many} other {other}}'
    expect([0, 1, 2, 3, 11, 100].map((n) => formatMessage(forms, { n }, 'ar'))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ])
  })

  test('takes an exact match before the category', () => {
    const forms = '{count, plural, =0 {No results} one {# result} other {# results}}'
    expect(formatMessage(forms, { count: 0 }, 'en')).toBe('No results')
    expect(formatMessage(forms, { count: 1 }, 'en')).toBe('1 result')
    expect(formatMessage(forms, { count: 7 }, 'en')).toBe('7 results')
  })

  test('counts from the offset', () => {
    const forms =
      '{n, plural, offset:1 =0 {Nobody} =1 {Ana} one {Ana and # other} other {Ana and # others}}'
    expect(formatMessage(forms, { n: 1 }, 'en')).toBe('Ana')
    expect(formatMessage(forms, { n: 2 }, 'en')).toBe('Ana and 1 other')
    expect(formatMessage(forms, { n: 4 }, 'en')).toBe('Ana and 3 others')
  })

  test('writes `#` in the locale', () => {
    expect(formatMessage('{n, plural, other {# Zeilen}}', { n: 1200 }, 'de')).toBe('1.200 Zeilen')
  })

  test('picks forms by one locale and writes numbers in another', () => {
    /* An English fallback on a Polish page counts in English, with Polish digits. */
    const forms = '{n, plural, one {# result} other {# results}}'
    expect(formatMessage(forms, { n: 1200 }, 'pl', { plurals: 'en' })).toBe('1200 results')
    expect(formatMessage(forms, { n: 1 }, 'pl', { plurals: 'en' })).toBe('1 result')
  })

  test('takes ordinal forms', () => {
    const place = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
    expect([1, 2, 3, 4, 11, 22].map((n) => formatMessage(place, { n }, 'en'))).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '22nd',
    ])
  })
})

describe('a select message', () => {
  const sorted =
    '{order, select, ascending {Sorted by {column}, ascending} descending {Sorted by {column}, descending} other {Sorted by {column}}}'

  test('writes the whole sentence for each choice', () => {
    expect(formatMessage(sorted, { column: 'Name', order: 'descending' }, 'en')).toBe(
      'Sorted by Name, descending',
    )
    expect(formatMessage(sorted, { column: 'Name', order: 'sideways' }, 'en')).toBe(
      'Sorted by Name',
    )
  })

  test('reaches the count of a plural it sits in', () => {
    const forms = '{n, plural, other {{kind, select, row {# rows} other {# items}}}}'
    expect(formatMessage(forms, { kind: 'row', n: 3 }, 'en')).toBe('3 rows')
  })
})

describe('quoting', () => {
  test('reads two apostrophes as one', () => {
    expect(formatMessage("It''s {name}", { name: 'done' }, 'en')).toBe("It's done")
  })

  test('keeps a lone apostrophe as text', () => {
    expect(formatMessage("L'élément {name}", { name: 'A' }, 'fr')).toBe("L'élément A")
  })

  test('writes a quoted brace as text', () => {
    expect(formatMessage("Type '{name}' to search", { name: 'x' }, 'en')).toBe(
      'Type {name} to search',
    )
  })

  test('writes a quoted `#` as text inside a plural', () => {
    expect(formatMessage("{n, plural, other {# in '#'1}}", { n: 2 }, 'en')).toBe('2 in #1')
  })
})

describe('a message that does not parse', () => {
  test('shows as written', () => {
    expect(formatMessage('{count, plural, one {#', { count: 1 }, 'en')).toBe(
      '{count, plural, one {#',
    )
    expect(formatMessage('Stray } brace', {}, 'en')).toBe('Stray } brace')
  })

  test('writes the value of an argument type it does not know', () => {
    expect(formatMessage('Sent {when, date, short}', { when: 'today' }, 'en')).toBe('Sent today')
  })
})

describe('isolation', () => {
  test('wraps each value in isolates, so its order survives a right-to-left sentence', () => {
    expect(
      formatMessage('{name} moved to {x}, {y}', { name: 'Card', x: -12, y: 30 }, 'en', {
        isolate: true,
      }),
    ).toBe('⁨Card⁩ moved to ⁨-12⁩, ⁨30⁩')
  })
})
