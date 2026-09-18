import { describe, expect, test } from 'bun:test'
import { hasPart, hostTag, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = withoutStyles(
  ssr(html`<helix-steps label="Checkout">
  <helix-step complete>Details</helix-step>
  <helix-step current>Payment</helix-step>
</helix-steps>`),
)

describe('steps server output', () => {
  test('the marker and the body ship before any script runs', () => {
    expect(hasPart(markup, 'marker')).toBe(true)
    expect(hasPart(markup, 'body')).toBe(true)
  })

  test('neither half of the rule is markup, both being drawn by the sheet', () => {
    /* The line is the step's own and is placed entirely from properties the list
       hands down, so it is `:host::before` and `:host::after` rather than two
       boxes: nothing ships for it and nothing needs to, the sheet arriving with
       the definition. `step-geometry.dom.spec.ts` is where it is drawn. */
    expect(hasPart(markup, 'lead')).toBe(false)
    expect(hasPart(markup, 'trail')).toBe(false)
  })

  test('the host carries no role attribute, having said it through internals', () => {
    expect(hostTag(markup, 'helix-steps')).not.toContain('role=')
  })

  test('a step arrives with the mark its state calls for', () => {
    // The state is declared on each step rather than counted from an index, so
    // the server can render it. An `active` on the list could not: it would
    // have to count slotted children, and there are none here.
    expect(rendered(markup, 'helix-steps')).toContain('svg')
  })
})
