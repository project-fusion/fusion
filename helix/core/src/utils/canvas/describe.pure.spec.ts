import { describe, expect, test } from 'bun:test'
import { descriptionOf } from './describe.js'

describe('descriptionOf', () => {
  test('joins the words with commas in English, as before', () => {
    expect(descriptionOf('en', ['selected', 'Blocked', 'leads to Second'])).toBe(
      'selected, Blocked, leads to Second',
    )
    expect(descriptionOf('en-US', ['selected', 'Blocked'])).toBe('selected, Blocked')
  })

  test('leaves out an empty word, and says nothing for none', () => {
    expect(descriptionOf('en', ['', 'Blocked', undefined])).toBe('Blocked')
    expect(descriptionOf('en', ['', undefined])).toBe('')
  })

  test('joins the words the way the locale writes a list', () => {
    expect(descriptionOf('de', ['ausgewählt', 'Blockiert'])).toBe('ausgewählt und Blockiert')
    expect(descriptionOf('ja', ['選択済み', 'ブロック'])).toBe('選択済み、ブロック')
  })
})
