import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('empty view server output', () => {
  test('the slot the explanation lands in is served', () => {
    /* `toContain('No results.')` read the host's own light-DOM child back out
       of the render, so it passed with the view rendering no slot at all. Read
       off one with no children: the only shadow root is its own. */
    const markup = ssr(html`<helix-headless-empty></helix-headless-empty>`)
    expect(rendered(markup, 'helix-headless-empty')).toMatch(/<slot\s*><\/slot>/)
  })

  test('a heading from words is served as a heading', () => {
    const markup = rendered(
      ssr(html`<helix-headless-empty heading="No projects yet"></helix-headless-empty>`),
      'helix-headless-empty',
    )
    expect(markup).toMatch(/<div aria-level="3" part="heading" role="heading">/)
    expect(markup).toContain('No projects yet')
  })

  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-empty no-announce>x</helix-headless-empty>`)
    expect(hostAttributes(markup, 'helix-headless-empty')).toEqual(['no-announce'])
  })
})
