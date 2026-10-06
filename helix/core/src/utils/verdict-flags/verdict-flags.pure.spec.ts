import { describe, expect, test } from 'bun:test'
import { verdictFlags } from './verdict-flags.js'

/* What `setValidity` is handed for a picker field's verdict. */
describe('verdictFlags', () => {
  test('nothing wrong is no flags at all', () => {
    expect(verdictFlags('')).toBeNull()
  })

  test('a message alone is a bad input', () => {
    expect(verdictFlags('Enter a date.')).toEqual([{ badInput: true }, 'Enter a date.'])
  })

  test('a flag and a message set that flag', () => {
    expect(verdictFlags(['rangeUnderflow', 'Choose a date on or after May 1.'])).toEqual([
      { rangeUnderflow: true },
      'Choose a date on or after May 1.',
    ])
  })
})
