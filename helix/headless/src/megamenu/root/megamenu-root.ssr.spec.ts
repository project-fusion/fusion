import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('megamenu server output', () => {
  test('the trigger ships closed, which is what a fresh load shows', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`),
    )
    expect(partTag(markup, 'trigger')).toContain('aria-expanded="false"')
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('and the panel ships with it, hidden rather than absent', () => {
    /* So the links inside are in the document a crawler and a reader without
       JavaScript both get, and so nothing has to arrive after hydration for the
       navigation to be complete. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`),
    )
    expect(hasPart(markup, 'surface')).toBe(true)
    // On the panel, not somewhere in the document: `hidden` is four characters
    // that turn up in a `data-` name or a slot name as readily as on the box
    // this test is about.
    expect(partTag(markup, 'surface')).toContain('hidden')
  })

  test('the host carries nothing the consumer did not write', () => {
    // `open` is state and does not reflect. A copied host that came back
    // declaring it would seed the element from markup a consumer never wrote.
    const markup = ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`)
    expect(hostAttributes(markup, 'helix-headless-megamenu')).toEqual(['label'])
  })

  test('`default-open` serves the panel showing rather than opening it on upgrade', () => {
    /* A megamenu panel is the width of the page, so a seed resolved on the
       first client update moves everything under it once on every load that
       declared one open. */
    const open = ssr(
      html`<helix-headless-megamenu default-open label="Products"></helix-headless-megamenu>`,
    )
    expect(partTag(open, 'surface')).not.toMatch(/\shidden[\s=>]/)

    const shut = ssr(html`<helix-headless-megamenu label="Products"></helix-headless-megamenu>`)
    expect(partTag(shut, 'surface')).toMatch(/\shidden[\s=>]/)
  })
})
