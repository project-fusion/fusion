import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('skeleton server output', () => {
  test('the placeholder is in the served markup', () => {
    expect(
      hasPart(ssr(html`<helix-headless-skeleton></helix-headless-skeleton>`), 'skeleton'),
    ).toBe(true)
  })

  test('serves the sheen inside the shape, as a part', () => {
    expect(hasPart(ssr(html`<helix-headless-skeleton></helix-headless-skeleton>`), 'sheen')).toBe(
      true,
    )
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-skeleton shape="text"></helix-headless-skeleton>`)
    expect(hostAttributes(markup, 'helix-headless-skeleton')).toEqual(['shape'])
  })

  /* A server has no children to read, so it cannot tell content from a
     placeholder the page drew. It serves the loading state it can know: the
     content inert, the placeholder showing with the shape as its slot's
     fallback, and neither hidden. The client hides the side that does not
     show once it has the children. */
  test('serves a loading skeleton with the content inert and the placeholder showing', () => {
    const markup = ssr(
      html`<helix-headless-skeleton loading
        ><div slot="placeholder"></div><p>Card</p></helix-headless-skeleton
      >`,
    )
    expect(servedParts(markup)).toEqual(['content', 'placeholder', 'sheen', 'skeleton'])
    expect(partTag(markup, 'content')).toMatch(/\sinert(=""|\s|>)/)
    expect(partTag(markup, 'content')).not.toMatch(/\shidden(=""|\s|>)/)
    expect(partTag(markup, 'placeholder')).toMatch(/aria-hidden="true"/)
    expect(partTag(markup, 'placeholder')).not.toMatch(/\shidden(=""|\s|>)/)
    expect(rendered(markup, 'helix-headless-skeleton')).toMatch(
      /<slot\s+name="placeholder"[^>]*>[\s\S]*part="skeleton"[\s\S]*<\/slot>/,
    )
    expect(hostAttributes(markup, 'helix-headless-skeleton')).toEqual(['loading'])
  })

  test('serves a loaded skeleton with the content in reach', () => {
    const markup = ssr(html`<helix-headless-skeleton><p>Card</p></helix-headless-skeleton>`)
    expect(partTag(markup, 'content')).not.toMatch(/\sinert(=""|\s|>)/)
  })
})
