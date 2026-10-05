import { describe, expect, test } from 'bun:test'
import { hasPart, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('qr code server output', () => {
  test('the code is encoded on the server, not waiting for a script', () => {
    /* The encoder is a pure function of the value and needs no DOM, so the
       square can be in the first response. A code that appeared only after
       hydration would be a blank box in any reader with script turned off, and
       a picture is exactly the thing that should not need one. */
    const markup = ssr(
      html`<helix-headless-qr-code value="https://fusion.dev"></helix-headless-qr-code>`,
    )
    expect(hasPart(markup, 'code')).toBe(true)
    expect(partTag(markup, 'modules')).toMatch(/\sd="M/)
  })

  test('and it is named, so the name ships with it', () => {
    /* Off the graphic and not out of the document. `label="Our site"` is on the
       host, so a whole-render search for the name passes on the consumer's own
       markup, and this test went on passing with `aria-label` emptied in the
       render. */
    const markup = ssr(
      html`<helix-headless-qr-code label="Our site" value="https://fusion.dev"></helix-headless-qr-code>`,
    )
    expect(partTag(markup, 'code')).toContain('aria-label="Our site"')
  })

  test('an empty value draws nothing rather than an empty square', () => {
    expect(
      hasPart(ssr(html`<helix-headless-qr-code value=""></helix-headless-qr-code>`), 'code'),
    ).toBe(false)
  })

  test('a value too long for a code serves the fallback in its place', () => {
    const long = 'x'.repeat(3000)
    const markup = ssr(html`<helix-headless-qr-code value=${long}></helix-headless-qr-code>`)
    expect(hasPart(markup, 'code')).toBe(false)
    expect(hasPart(markup, 'fallback')).toBe(true)
    expect(
      hasPart(ssr(html`<helix-headless-qr-code value="one"></helix-headless-qr-code>`), 'fallback'),
    ).toBe(false)
  })
})
