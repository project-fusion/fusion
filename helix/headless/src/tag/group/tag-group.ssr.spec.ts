import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* A server cannot read a group's children, so its tags are lone tags until the
   group has read them: no row and no cell are served, and a hydrated page draws
   what was served first. */
describe('tag group server output', () => {
  test('serves a bare slot', () => {
    expect(
      rendered(
        ssr(html`<helix-headless-tag-group></helix-headless-tag-group>`),
        'helix-headless-tag-group',
      ),
    ).toMatch(/<slot\s*><\/slot>/)
  })

  test('and its tags serve no cell', () => {
    const markup = ssr(
      html`<helix-headless-tag-group label="Fruit"><helix-headless-tag>Apple</helix-headless-tag></helix-headless-tag-group>`,
    )
    expect(hasPart(markup, 'cell')).toBe(false)
  })
})
