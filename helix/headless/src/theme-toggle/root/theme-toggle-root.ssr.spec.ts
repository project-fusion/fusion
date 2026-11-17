import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/** The server output: the button, named and not pressed, since a server has no mode to read. */
const markup = ssr(html`<helix-headless-theme-toggle></helix-headless-theme-toggle>`)

describe('theme toggle server output', () => {
  test('the button is served named and not pressed', () => {
    const button = partTag(markup, 'button')
    expect(button).toContain('aria-label="Dark mode"')
    expect(button).toContain('aria-pressed="false"')
  })

  test('the host writes no attributes of its own', () => {
    expect(hostAttributes(markup, 'helix-headless-theme-toggle')).toEqual([])
  })
})
