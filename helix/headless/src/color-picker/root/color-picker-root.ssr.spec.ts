import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('color picker server output', () => {
  test('the hex field carries the autofill token it was given', () => {
    /* The field is a plain text input to the browser, so a password manager
       offers it whatever it likes unless a token says otherwise, and it reads
       that token off the parsed markup before anything upgrades. Nothing in
       this component reads the property for anything else, so a binding that
       stopped forwarding is silent.

       `on` rather than the `off` it defaults to: read against the default the
       assertion passes against a template writing the literal. */
    expect(
      partTag(
        ssr(html`<helix-headless-color-picker autocomplete="on"></helix-headless-color-picker>`),
        'value',
      ),
    ).toContain('autocomplete="on"')
  })

  test('and a picker with no hex field has nothing to put it on', () => {
    // `no-value` takes the field out, which is the one arrangement where the
    // token has nowhere to land.
    expect(
      hasPart(
        ssr(html`<helix-headless-color-picker no-value></helix-headless-color-picker>`),
        'value',
      ),
    ).toBe(false)
  })
  test('the square and the presets are served with the color named', () => {
    /* A reader on a page that has not upgraded yet hears what the server sent,
       so the name has to be in that markup and not only in the client's. */
    const markup = ssr(
      html`<helix-headless-color-picker value="#ff0000" swatches="#0000ff"></helix-headless-color-picker>`,
    )
    expect(partTag(markup, 'grid-saturation')).toContain(
      'aria-valuetext="Saturation 100%, Brightness 100%, vibrant red"',
    )
    expect(partTag(markup, 'swatch')).toContain('aria-label="dark vibrant blue"')
  })
})
