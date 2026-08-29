import { describe, expect, test } from 'bun:test'
import { hasPart, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('qr code server output', () => {
  test('the code is encoded on the server, not waiting for a script', () => {
    /* The encoder is a pure function of the value and needs no DOM, so the
       square can be in the first response. A code that appeared only after
       hydration would be a blank box in any reader with script turned off, and
       a picture is exactly the thing that should not need one. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-qr-code value="https://fusion.dev"></helix-headless-qr-code>`),
    )
    expect(hasPart(markup, 'code')).toBe(true)
    expect(markup).toContain('<path')
  })

  test('and it is named, so the name ships with it', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-qr-code label="Our site" value="https://fusion.dev"></helix-headless-qr-code>`,
      ),
    )
    expect(markup).toContain('Our site')
  })

  test('an empty value draws nothing rather than an empty square', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-qr-code value=""></helix-headless-qr-code>`),
    )
    expect(hasPart(markup, 'code')).toBe(false)
  })
})
