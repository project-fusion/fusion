import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('switch server output', () => {
  test('the track and the thumb are both in the served markup', () => {
    // The picture is the whole point of shipping it: a switch that arrives as
    // a bare checkbox and becomes a switch on hydration is a visible flip.
    const markup = ssr(html`<helix-headless-switch>Dark mode</helix-headless-switch>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'thumb')).toBe(true)
  })

  test('the label arrives as the slot"s fallback, so the words are in the HTML', () => {
    expect(
      withoutStyles(ssr(html`<helix-headless-switch label="Dark mode"></helix-headless-switch>`)),
    ).toContain('Dark mode')
  })

  test('checked reaches the input, and the host carries only what was typed', () => {
    /* No `data-checked` beside it, though the fill and the thumb's travel
       select on it. Shadow styles arrive with the definition rather than in the
       markup, so nothing is drawn in either position until the element upgrades
       and `elements.css` hides the tag by visibility until it does: serving the
       attribute buys no first paint and costs a hydration mismatch on every
       switch a React consumer serves checked. */
    const markup = ssr(html`<helix-headless-switch checked></helix-headless-switch>`)
    expect(partTag(markup, 'control')).toContain('checked')
    expect(hostAttributes(markup, 'helix-headless-switch')).toEqual(['checked'])
  })

  test('the role is not an attribute, because it goes through internals', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-switch></helix-headless-switch>`),
        'helix-headless-switch',
      ),
    ).toEqual([])
  })
})
