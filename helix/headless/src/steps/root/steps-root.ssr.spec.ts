import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('steps server output', () => {
  const served = ssr(html`<helix-headless-steps label="Checkout" linear>
    <helix-headless-step complete value="cart">Cart</helix-headless-step>
    <helix-headless-step current value="pay">Pay</helix-headless-step>
  </helix-headless-steps>`)

  test('the hosts carry only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-headless-steps')).toEqual(['label', 'linear'])
  })

  /* A server knows which stage is finished and which is current, so the words
     and the state are served on the stage's own button. */
  test('a finished stage is described in words, and the current one is marked on its button', () => {
    const done = ssr(html`<helix-headless-step complete>Cart</helix-headless-step>`)
    expect(partTag(done, 'label')).toContain('aria-describedby="state"')
    expect(partTag(done, 'state')).toContain('hidden')
    const here = ssr(html`<helix-headless-step current>Pay</helix-headless-step>`)
    expect(partTag(here, 'label')).toContain('aria-current="step"')
  })
})
