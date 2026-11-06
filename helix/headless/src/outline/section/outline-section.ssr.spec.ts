import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* An outline section on a server: it draws its slot, and its host carries
   only what the page wrote. Its id is written on the client, from `anchor`,
   where the page gave none. */
describe('outline section server output', () => {
  test('renders on a server, where there is no DOM to reach for', () => {
    const markup = ssr(
      html`<helix-headless-outline-section anchor="install"></helix-headless-outline-section>`,
    )
    expect(rendered(markup, 'helix-headless-outline-section')).toContain('<slot>')
  })

  test('the host declares nothing of its own', () => {
    const written = hostAttributes(
      ssr(html`<helix-headless-outline-section></helix-headless-outline-section>`),
      'helix-headless-outline-section',
    )
    expect(written).toEqual([])
  })
})
