import { describe, expect, test } from 'bun:test'
import { completionFor, creationFor } from './combobox-text.js'

const options = [
  { text: 'Go' },
  { disabled: true, text: 'Perl' },
  { hidden: true, text: 'Python' },
  { text: 'Rust' },
]

describe('completionFor', () => {
  test('answers the first option the typing begins, in its own case', () => {
    expect(completionFor('ru', options)).toBe('Rust')
  })

  test('skips a disabled option and a hidden one', () => {
    expect(completionFor('p', options)).toBe('')
  })

  test('answers nothing for nothing typed, and for the whole word typed', () => {
    expect(completionFor('', options)).toBe('')
    expect(completionFor('rust', options)).toBe('')
  })
})

describe('creationFor', () => {
  test('answers the trimmed words where no option holds them', () => {
    expect(creationFor(' Zig ', true, options)).toBe('Zig')
  })

  test('answers nothing where an option holds them, case aside', () => {
    expect(creationFor('rust', true, options)).toBe('')
  })

  test('answers nothing unless the field is creatable, and for nothing typed', () => {
    expect(creationFor('Zig', false, options)).toBe('')
    expect(creationFor('  ', true, options)).toBe('')
  })
})
