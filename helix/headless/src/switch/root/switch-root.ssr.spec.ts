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
    /* `data-checked` was served beside it until 27 Aug 2026, and this test said
       the fill and the thumb"s travel select on it, so a switch shipped without
       it is drawn off until hydration and then jumps. That was true of a
       consumer serving declarative shadow DOM, where the styles are in the
       markup. There is none here: shadow styles arrive with the definition, so
       nothing is drawn in either position until the element upgrades, and
       `elements.css` hides the tag by visibility until it does. What the
       attribute cost in exchange was a hydration mismatch on every switch a
       React consumer served checked. */
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
