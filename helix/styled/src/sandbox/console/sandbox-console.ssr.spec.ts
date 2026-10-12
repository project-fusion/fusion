import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-sandbox-console></helix-sandbox-console>`)

describe('sandbox console server output', () => {
  test('it serves its log, named, with no output to show yet', () => {
    // Everything it shows arrives from a frame that only exists in a browser,
    // so a console is always empty on the server.
    expect(hasPart(markup, 'output')).toBe(true)
    expect(rendered(markup, 'helix-sandbox-console')).toContain('aria-label="Console output"')
  })

  test('the region a screen reader hears is in the served markup', () => {
    expect(hasPart(markup, 'live')).toBe(true)
    expect(rendered(markup, 'helix-sandbox-console')).toContain('role="log"')
  })

  test('the host carries only what the consumer wrote', () => {
    // No attribute the element gives itself on upgrade, or a consumer's server
    // markup and their hydrated tree disagree.
    expect(hostTag(markup, 'helix-sandbox-console')).toBe('<helix-sandbox-console>')
  })
})
