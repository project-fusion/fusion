import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('sparkline server output', () => {
  test('the line is drawn on the server, because the numbers are in the markup', () => {
    /* The reason `values` is worth having beyond the sentence in the docs: a
       sparkline reading an attribute needs no document to resolve, so unlike
       the legend it arrives whole and nothing appears on hydration. */
    const markup = ssr(
      html`<helix-headless-sparkline label="Sessions over a week" values="1 5 9"></helix-headless-sparkline>`,
    )
    expect(partTag(markup, 'line')).toContain('M0,32')
    /* Read off the graphic rather than out of the document, because the name is
       on the host two attributes away: a whole-render search for it passes on
       the consumer's own `label=` whether or not the drawing carries a name,
       and went on passing here with `aria-label` removed from the render. */
    /* Named and with readings, it is read by key, so it is served as the
       focusable `application` every chart's plot is. */
    expect(partTag(markup, 'svg')).toContain('role="application"')
    expect(partTag(markup, 'svg')).toContain('tabindex="0"')
    expect(partTag(markup, 'svg')).toContain('aria-label="Sessions over a week"')
  })

  test('an unlabelled one is served decorative rather than as an unnamed graphic', () => {
    expect(
      partTag(
        ssr(html`<helix-headless-sparkline values="1 5 9"></helix-headless-sparkline>`),
        'svg',
      ),
    ).toContain('aria-hidden="true"')
  })

  test('the host carries nothing the consumer did not write', () => {
    expect(
      hostAttributes(
        ssr(html`<helix-headless-sparkline></helix-headless-sparkline>`),
        'helix-headless-sparkline',
      ),
    ).toEqual([])
  })
})
