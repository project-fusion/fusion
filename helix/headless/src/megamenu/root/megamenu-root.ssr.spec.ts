import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('megamenu server output', () => {
  test('the trigger ships closed, which is what a fresh load shows', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`),
    )
    expect(markup).toContain('aria-expanded="false"')
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('and the panel ships with it, hidden rather than absent', () => {
    /* So the links inside are in the document a crawler and a reader without
       JavaScript both get, and so nothing has to arrive after hydration for the
       navigation to be complete. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`),
    )
    expect(hasPart(markup, 'panel')).toBe(true)
    expect(markup).toContain('hidden')
  })

  test('the host carries nothing the consumer did not write', () => {
    // `open` is state and does not reflect: a copied host that came back
    // declaring it would latch controlled and freeze, which the value mixins
    // record at length.
    const markup = ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`)
    expect(hostAttributes(markup, 'helix-headless-megamenu')).toEqual(['label'])
  })
})
