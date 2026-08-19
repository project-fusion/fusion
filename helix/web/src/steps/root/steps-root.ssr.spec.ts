import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-steps label="Checkout">
  <helix-step complete>Details</helix-step>
  <helix-step current>Payment</helix-step>
</helix-steps>`)

describe('steps server output', () => {
  test('the marker and the body ship before any script runs', () => {
    expect(hasPart(markup, 'marker')).toBe(true)
    expect(hasPart(markup, 'body')).toBe(true)
  })

  test('the connector ships too, since the line is the step’s own', () => {
    expect(hasPart(markup, 'connector')).toBe(true)
  })

  test('the host carries no role attribute, having said it through internals', () => {
    expect(hostTag(markup, 'helix-steps')).not.toContain('role=')
  })

  test('a finished step arrives with its check, not with a number to swap', () => {
    // The state is declared on each step rather than counted from an index, so
    // the server can render it. An `active` on the list could not: it would
    // have to count slotted children, and there are none here.
    expect(markup).toContain('svg')
  })
})
