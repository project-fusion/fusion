import { describe, expect, test } from 'bun:test'
import { partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('time input server output', () => {
  test('the placeholder and the autofill token reach the control together', () => {
    /* Both are the browser's to act on and neither is read here. The
       placeholder is painted into the empty field before anything upgrades, and
       the token decides what a password manager offers; forwarded at hydration
       each arrives after the pass that used it. */
    const markup = partTag(
      ssr(
        html`<helix-headless-time-input
          label="Start"
          placeholder="hh:mm"
          autocomplete="off"
        ></helix-headless-time-input>`,
      ),
      'control',
    )
    expect(markup).toContain('placeholder="hh:mm"')
    expect(markup).toContain('autocomplete="off"')
  })

  test('the clock trigger is named, its content being a glyph', () => {
    // A phrase the component does not default to: `triggerLabel` holds "Choose
    // a time", so asserting that would pass against a template literal.
    expect(
      partTag(
        ssr(
          html`<helix-headless-time-input
            label="Start"
            trigger-label="Pick from a clock"
          ></helix-headless-time-input>`,
        ),
        'trigger',
      ),
    ).toContain('aria-label="Pick from a clock"')
  })

  test('`default-open` serves the surface showing and the trigger saying so', () => {
    const open = ssr(
      html`<helix-headless-time-input label="Start" default-open></helix-headless-time-input>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)
    expect(partTag(open, 'trigger')).toContain('aria-expanded="true"')

    const shut = ssr(html`<helix-headless-time-input label="Start"></helix-headless-time-input>`)
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
    expect(partTag(shut, 'trigger')).toContain('aria-expanded="false"')
  })
})
