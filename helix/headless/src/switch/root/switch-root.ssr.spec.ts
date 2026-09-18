import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('switch server output', () => {
  test('the track is in the served markup, and no box for the thumb', () => {
    /* The picture is the whole point of shipping it: a switch that arrives as a
       bare checkbox and becomes a switch on hydration is a visible flip. The
       thumb is a consumer's `::part(track)::after`: this tier ships no sheet, so
       a box for it would be an empty child in their layout and nothing else. */
    const markup = ssr(html`<helix-headless-switch>Dark mode</helix-headless-switch>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'thumb')).toBe(false)
  })

  test("the label arrives as the slot's fallback, so the words are in the HTML", () => {
    /* Against the whole render this passed on the consumer's own
       `label="Dark mode"` in the host tag, so it held with the fallback taken
       out of the slot. The words are only in the HTML if the component drew
       them, which is what the shadow root says. */
    const markup = ssr(html`<helix-headless-switch label="Dark mode"></helix-headless-switch>`)
    expect(hasPart(markup, 'label')).toBe(true)
    expect(rendered(markup, 'helix-headless-switch')).toContain('Dark mode')
  })

  test('checked reaches the input, an off switch says nothing, and the host carries only what was typed', () => {
    /* No `data-checked` beside it, though the fill and the thumb's travel
       select on it. Shadow styles arrive with the definition rather than in the
       markup, so nothing is drawn in either position until the element upgrades
       and `elements.css` hides the tag by visibility until it does: serving the
       attribute buys no first paint and costs a hydration mismatch on every
       switch a React consumer serves checked.

       **Both polarities, because only the off one can fail.** `checked` is a
       boolean attribute and is true wherever it is present. This asked the on
       case alone and would have passed inverted: it held while every off switch
       on every server shipped `checked="false"`, which a reader is told is on. */
    const on = ssr(html`<helix-headless-switch checked></helix-headless-switch>`)
    expect(partTag(on, 'control')).toContain('checked')
    expect(hostAttributes(on, 'helix-headless-switch')).toEqual(['checked'])
    const off = ssr(html`<helix-headless-switch></helix-headless-switch>`)
    expect(partTag(off, 'control')).not.toContain('checked')
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
