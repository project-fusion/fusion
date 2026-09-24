import { describe, expect, test } from 'bun:test'
import { fillTemplate } from './fill-template.js'

describe('a label with its placeholders filled in', () => {
  test('each placeholder takes its value, in whatever order the sentence puts them', () => {
    expect(fillTemplate('{count} de {index}', { count: 5, index: 2 })).toBe('5 de 2')
  })

  test('a placeholder written twice is filled twice', () => {
    expect(fillTemplate('{name}, then {name}', { name: 'Plan' })).toBe('Plan, then Plan')
  })

  test('a value is put in as written, dollar signs and all', () => {
    // Read as a pattern, `$$` came out as one dollar and `$&` as the placeholder.
    expect(fillTemplate('Remove {name}', { name: 'Tier $$ and $&' })).toBe('Remove Tier $$ and $&')
  })

  test('a placeholder with no value is left as written, so the gap shows', () => {
    expect(fillTemplate('{from} to {to}', { from: 'Plan' })).toBe('Plan to {to}')
  })
})
