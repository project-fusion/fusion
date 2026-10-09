import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/** The server output: the button, named and not pressed, since nothing is paused on a server. */
const markup = ssr(html`<helix-headless-motion-toggle></helix-headless-motion-toggle>`)

describe('motion toggle server output', () => {
  test('the button is served named and not pressed', () => {
    const button = partTag(markup, 'button')
    expect(button).toContain('aria-label="Pause motion"')
    expect(button).toContain('aria-pressed="false"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-motion-toggle')).toEqual([])
  })
})
