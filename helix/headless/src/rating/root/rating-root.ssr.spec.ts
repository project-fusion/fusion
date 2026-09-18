import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
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

  test('the question and the help are served with the marks, not after them', () => {
    /* The mixin's four rows of API reached the manifest and no markup: a
       consumer could set all of them and a server would send a bare row. */
    const markup = ssr(
      html`<helix-headless-rating hint="Five is best" label="Rate this" value="4.2"></helix-headless-rating>`,
    )
    expect(rendered(markup, 'helix-headless-rating')).toContain('Rate this')
    expect(rendered(markup, 'helix-headless-rating')).toContain('Five is best')
    expect(servedParts(markup)).toContain('label')
    expect(servedParts(markup)).toContain('hint')
  })

  test('and a message already failing is served as one, rather than on hydration', () => {
    const markup = ssr(
      html`<helix-headless-rating feedback="Choose a rating" label="Rate this"></helix-headless-rating>`,
    )
    expect(partTag(markup, 'feedback')).toContain('role="alert"')
    expect(rendered(markup, 'helix-headless-rating')).toContain('Choose a rating')
  })

  test('the group says it is described and required, both of which are attributes', () => {
    const markup = ssr(
      html`<helix-headless-rating hint="Five is best" label="Rate this" required></helix-headless-rating>`,
    )
    expect(partTag(markup, 'marks')).toContain('aria-describedby="helix-hint"')
    expect(partTag(markup, 'marks')).toContain('aria-required="true"')
  })

  test('the marks and the readout are served in a row of their own', () => {
    expect(hasPart(ssr(given), 'field')).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    /* `shape` must not take a default: the resting star written onto every
       rating served is an attribute React holds no prop for, and so a hydration
       mismatch for each one. */
    expect(hostAttributes(ssr(given), 'helix-headless-rating')).toEqual(['label', 'value'])
  })
})
