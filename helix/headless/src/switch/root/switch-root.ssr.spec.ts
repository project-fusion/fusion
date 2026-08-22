import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('switch server output', () => {
  test('the track and the thumb are both in the served markup', () => {
    // The picture is the whole point of shipping it: a switch that arrives as
    // a bare checkbox and becomes a switch on hydration is a visible flip.
    const markup = ssr(html`<helix-base-switch>Dark mode</helix-base-switch>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'thumb')).toBe(true)
  })

  test('the label arrives as the slot"s fallback, so the words are in the HTML', () => {
    expect(
      withoutStyles(ssr(html`<helix-base-switch label="Dark mode"></helix-base-switch>`)),
    ).toContain('Dark mode')
  })

  test('checked reaches the input and the host"s styling hook alike', () => {
    // Both, and the second is the one that matters here. `data-checked` is what
    // the fill and the thumb"s travel select on, so a checked switch that ships
    // without it is drawn in the off position until hydration and then jumps.
    const markup = ssr(html`<helix-base-switch checked></helix-base-switch>`)
    expect(partTag(markup, 'control')).toContain('checked')
    expect(hostAttributes(markup, 'helix-base-switch')).toEqual(['checked', 'data-checked'])
  })

  test('the role is not an attribute, because it goes through internals', () => {
    expect(
      hostAttributes(ssr(html`<helix-base-switch></helix-base-switch>`), 'helix-base-switch'),
    ).toEqual([])
  })
})
