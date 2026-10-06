import { describe, expect, test } from 'bun:test'
import { hostAttributes, hostTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/* A rule draws nothing inside: what a server must get right is that it renders
   at all and writes nothing onto the host the page did not write. Its role is
   on `ElementInternals`, which is not in the markup. */
describe('option separator server output', () => {
  test('renders on a server, and the host declares nothing of its own', () => {
    const markup = ssr(html`<helix-headless-option-separator></helix-headless-option-separator>`)
    expect(hostTag(markup, 'helix-headless-option-separator')).not.toBe('')
    expect(hostAttributes(markup, 'helix-headless-option-separator')).toEqual([])
  })
})
