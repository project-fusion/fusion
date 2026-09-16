import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-sandbox-terminal></helix-sandbox-terminal>`)

describe('sandbox terminal server output', () => {
  test('it serves the empty state, with no output to show yet', () => {
    // Everything it shows arrives from a frame that only exists in a browser,
    // so a terminal is always empty on the server. Rendering the empty state
    // rather than nothing means the panel is the height it will stay.
    expect(hasPart(markup, 'empty')).toBe(true)
    expect(hasPart(markup, 'entry')).toBe(false)
  })

  test('the log region is announced from the served markup', () => {
    expect(rendered(markup, 'helix-sandbox-terminal')).toContain('role="log"')
  })

  test('the host carries only what the consumer wrote', () => {
    // No attribute the element gives itself on upgrade, or a consumer's server
    // markup and their hydrated tree disagree.
    expect(hostTag(markup, 'helix-sandbox-terminal')).toBe('<helix-sandbox-terminal>')
  })
})
