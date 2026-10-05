import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('switch server output', () => {
  test('the track ships with the thumb in it, so the picture is not a bare checkbox', () => {
    /* A switch that arrives as a checkbox and becomes a switch on hydration is
       a visible flip, which is the whole reason the groove is served. The thumb
       is an element of this tier, a part that can hold an icon, and the sheet
       is in the served markup beside it, so the picture is complete either way. */
    const markup = ssr(html`<helix-switch>Dark mode</helix-switch>`)
    expect(hasPart(markup, 'track')).toBe(true)
    expect(hasPart(markup, 'thumb')).toBe(true)
    expect(styles(markup)).toContain('[part="thumb"]')
    expect(partTag(markup, 'control')).toContain('role="switch"')
  })

  test('the thumb serves the icon for the state the switch is in, and hides the other', () => {
    const off = ssr(html`<helix-switch>Dark mode</helix-switch>`)
    expect(off).toMatch(/<slot name="on" hidden/)
    expect(off).not.toMatch(/<slot name="off" hidden/)
    const on = ssr(html`<helix-switch checked>Dark mode</helix-switch>`)
    expect(on).toMatch(/<slot name="off" hidden/)
    expect(on).not.toMatch(/<slot name="on" hidden/)
  })

  /**
   * **The half a server can get wrong, asserted on the tier a consumer ships.**
   *
   * `checked` is a boolean attribute and is true wherever it is present. A
   * property binding is what Lit SSR stringifies, and `checked="false"` was an
   * off switch served as on, which the fill and the thumb's travel then
   * contradicted the moment the element upgraded.
   *
   * Both polarities, because only the off one can fail.
   */
  test('the server says checked on a switch that is on and says nothing on one that is off', () => {
    expect(partTag(ssr(html`<helix-switch checked></helix-switch>`), 'control')).toContain(
      'checked',
    )
    expect(partTag(ssr(html`<helix-switch></helix-switch>`), 'control')).not.toContain('checked')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(ssr(html`<helix-switch checked></helix-switch>`), 'helix-switch'),
    ).toEqual(['checked'])
  })
})
