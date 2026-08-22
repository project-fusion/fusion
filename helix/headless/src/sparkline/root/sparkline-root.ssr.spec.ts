import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('sparkline server output', () => {
  test('the line is drawn on the server, because the numbers are in the markup', () => {
    /* The reason `values` is worth having beyond the sentence in the docs: a
       sparkline reading an attribute needs no document to resolve, so unlike
       the legend it arrives whole and nothing appears on hydration. */
    const markup = withoutStyles(
      ssr(html`<helix-sparkline label="Sessions over a week" values="1 5 9"></helix-sparkline>`),
    )
    expect(markup).toContain('M0,32')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('Sessions over a week')
  })

  test('an unlabelled one is served decorative rather than as an unnamed graphic', () => {
    expect(withoutStyles(ssr(html`<helix-sparkline values="1 5 9"></helix-sparkline>`))).toContain(
      'aria-hidden="true"',
    )
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(ssr(html`<helix-sparkline></helix-sparkline>`), 'helix-sparkline'),
    ).toEqual([])
  })
})
