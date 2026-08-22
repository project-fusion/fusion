import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('chart legend server output', () => {
  test('the list ships empty, because resolving an id wants a document', () => {
    /* `for` is an id and the server render has no document to look it up in, so
       this is the one component here that genuinely cannot be served whole. The
       table it reads is ordinary markup and is served in full, so what is
       missing before hydration is this list and nothing a reader needs. */
    const markup = withoutStyles(ssr(html`<helix-base-legend for="traffic"></helix-base-legend>`))
    expect(markup).toContain('part="list"')
    expect(markup).not.toContain('part="entry"')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(ssr(html`<helix-base-legend></helix-base-legend>`), 'helix-base-legend'),
    ).toEqual([])
  })

  test('for does not reflect, because React sets it as a property', () => {
    /* The same reason `Tooltip.for` does not: `for` exists on the prototype, so
       React assigns it and writes no attribute, and a `[for]` selector would
       find nothing. Asserted through the served markup, where the only `for`
       is the one the template wrote. */
    expect(
      hostAttributes(
        ssr(html`<helix-base-legend for="traffic"></helix-base-legend>`),
        'helix-base-legend',
      ),
    ).toEqual(['for'])
  })
})
