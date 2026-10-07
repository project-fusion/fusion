import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { slottedWords } from './slotted-words.js'

beforeAll(() => {
  registerDom()
})

const host = (markup: string): Element => {
  const element = document.createElement('div')
  element.innerHTML = markup
  return element
}

describe('the words a host says in its slots', () => {
  test('are the text of the default slot and of the slots named, in order', () => {
    const element = host('Apple <span slot="prefix">Red</span> <b>ripe</b> <i slot="end">later</i>')
    expect(slottedWords(element, [''])).toBe('Apple ripe')
    expect(slottedWords(element, ['', 'prefix'])).toBe('Apple Red ripe')
    expect(slottedWords(element, ['end'])).toBe('later')
  })

  test('leave out comments, such as the markers a template writes around its text', () => {
    const element = host('<!--?lit$406344759$-->August 4, 2026<!-- note -->')
    expect(slottedWords(element, [''])).toBe('August 4, 2026')
    expect(slottedWords(element, ['prefix'])).toBe('')
  })
})
