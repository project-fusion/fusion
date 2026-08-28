import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const given = html`<helix-headless-rating label="Rate this" value="4.2"></helix-headless-rating>`
const shown = html`<helix-headless-rating readonly value="4.2"></helix-headless-rating>`

describe('rating server output', () => {
  test('the score is drawn on the server, from a number it already has', () => {
    expect(partTag(ssr(given), 'marks')).toContain('--rating-full: 4')
    expect(partTag(ssr(given), 'marks')).toContain('--rating-part: 0.2')
  })

  test('the options ship with it, so the marks are pressable before hydration', () => {
    expect(hasPart(ssr(given), 'option')).toBe(true)
  })

  test('a readout ships no options, because there is nothing to choose', () => {
    expect(hasPart(ssr(shown), 'option')).toBe(false)
    expect(hasPart(ssr(shown), 'mark')).toBe(true)
  })

  test('and ships its name, since a picture of a score has to say what it is', () => {
    expect(partTag(ssr(shown), 'marks')).toContain('aria-label="4.2 out of 5"')
  })

  test('the two readings are different roles, not one role dressed down', () => {
    expect(partTag(ssr(given), 'marks')).toContain('role="radiogroup"')
    expect(partTag(ssr(shown), 'marks')).toContain('role="img"')
  })

  test('nothing waits on the client to know how many marks there are', () => {
    const markup = withoutStyles(ssr(given))
    expect([...markup.matchAll(/part="mark"/g)].length).toBe(10)
  })

  test('the host carries only what the consumer wrote', () => {
    /* `variant` reflected and defaulted to `marks`, so the server stamped
       `variant="marks"` onto every rating anybody rendered and React, which
       holds no such prop, reported a hydration mismatch for each one. */
    expect(hostAttributes(ssr(given), 'helix-headless-rating')).toEqual(['label', 'value'])
  })
})
