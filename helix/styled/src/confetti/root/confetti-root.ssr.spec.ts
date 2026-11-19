import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('confetti server output', () => {
  const served = ssr(html`<helix-confetti><button>Publish</button></helix-confetti>`)

  test('serves the slot for its content, and no canvas', () => {
    expect(rendered(served, 'helix-confetti')).toMatch(/<slot\b/)
    expect(rendered(served, 'helix-confetti')).not.toContain('<canvas')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-confetti')).toEqual([])
  })
})
