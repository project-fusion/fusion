import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('color input server output', () => {
  test('the field carries the placeholder and the autofill token it was given', () => {
    /* Both are read off the parsed markup and neither is read by this
       component: the placeholder is what the browser paints in an empty field
       before anything upgrades, and a password manager decides whether to offer
       a value from `autocomplete` on the real `<input>` rather than on the
       custom element around it.

       Words the component does not already hold, since `placeholder` defaults
       to `#000000` and `autocomplete` to `off`: asserting either default would
       pass against a template writing the literal. */
    const markup = partTag(
      ssr(
        html`<helix-headless-color-input
          label="Brand"
          placeholder="pick one"
          autocomplete="on"
        ></helix-headless-color-input>`,
      ),
      'control',
    )
    expect(markup).toContain('placeholder="pick one"')
    expect(markup).toContain('autocomplete="on"')
  })

  test('the swatch trigger is named, its only content being a color', () => {
    // A button whose content is a painted square announces as "button" without
    // this, which is every color input on the page saying nothing.
    const markup = ssr(
      html`<helix-headless-color-input
        label="Brand"
        trigger-label="Open the picker"
      ></helix-headless-color-input>`,
    )
    expect(partTag(markup, 'trigger')).toContain('aria-label="Open the picker"')
  })

  test('`default-open` serves the surface showing, and the trigger saying so', () => {
    /* The seed has to be resolved by the render the server sends, not by the
       first client update: a panel served hidden and revealed on upgrade is a
       flash on every load, and the `aria-expanded` beside it would disagree
       with the picture for exactly that window. */
    const open = ssr(
      html`<helix-headless-color-input label="Brand" default-open></helix-headless-color-input>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')
  })

  test('and a shut one is served shut, which is the resting state', () => {
    const shut = ssr(html`<helix-headless-color-input label="Brand"></helix-headless-color-input>`)
    expect(hasPart(shut, 'surface')).toBe(true)
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
    expect(partTag(shut, 'trigger')).toContain('aria-expanded="false"')
  })

  test('the picker forwards its buttons\u2019 live regions, so they can be styled from outside', () => {
    const forwards = partTag(
      ssr(
        html`<helix-headless-color-input label="Brand" default-open></helix-headless-color-input>`,
      ),
      'picker',
    )
    expect(forwards).toContain('eyedropper-live: picker-eyedropper-live')
    expect(forwards).toContain('format-live: picker-format-live')
  })
})
