import { describe, expect, test } from 'bun:test'
import { joinSaid } from './words.js'

describe('joinSaid', () => {
  test('ends a piece with a full stop before the next where it ends no sentence', () => {
    expect(joinSaid(['Draft saved', 'Your changes are kept.'])).toBe(
      'Draft saved. Your changes are kept.',
    )
    expect(joinSaid(['Done!', 'Next'])).toBe('Done! Next')
  })

  test('collapses the white space a template leaves, and drops what is empty', () => {
    expect(joinSaid(['  Saved \n  now ', '', '   '])).toBe('Saved now')
    expect(joinSaid([])).toBe('')
  })
})
