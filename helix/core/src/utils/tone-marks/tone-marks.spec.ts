import { describe, expect, test } from 'bun:test'
import { TONE_MARKS, toneMark } from './tone-marks.js'

/**
 * One vocabulary for the four status tones, so a passage and a message say the
 * same word for the same thing.
 *
 * The table is the point rather than the lookup: two components inventing their
 * own labels is how a callout comes to say `Error` where a toast says `Danger`
 * for the state a reader is in once.
 */
describe('the marks a status tone carries', () => {
  test('are the four tones and no others', () => {
    expect(Object.keys(TONE_MARKS).sort()).toEqual(['danger', 'info', 'success', 'warning'])
  })

  test('name the state in a reader’s words, not the tone’s', () => {
    expect(Object.entries(TONE_MARKS).map(([tone, mark]) => `${tone}: ${mark.label}`)).toEqual([
      'danger: Error',
      'info: Information',
      'success: Success',
      'warning: Warning',
    ])
  })

  test('and every one of them draws something', () => {
    for (const [tone, mark] of Object.entries(TONE_MARKS)) {
      expect(mark.icon, tone).toBeTruthy()
    }
  })

  test('each tone has its own glyph, so colour is never the only difference', () => {
    const glyphs = Object.values(TONE_MARKS).map((mark) => mark.icon)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })
})

describe('looking one up', () => {
  test('answers for a tone it knows', () => {
    expect(toneMark('success')?.label).toBe('Success')
  })

  /* No tone is the resting state of every component that takes one, so this is
     the common path rather than an error. */
  test('and answers nothing for no tone, rather than guessing one', () => {
    expect(toneMark(undefined)).toBeUndefined()
    expect(toneMark('')).toBeUndefined()
  })

  test('and nothing for a tone that is not a status', () => {
    expect(toneMark('primary')).toBeUndefined()
    expect(toneMark('neutral')).toBeUndefined()
  })
})
