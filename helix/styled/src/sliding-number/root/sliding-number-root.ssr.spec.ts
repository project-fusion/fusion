import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('sliding number server output', () => {
  const served = ssr(html`<helix-sliding-number .value=${42}></helix-sliding-number>`)

  test('serves the columns at their figures', () => {
    expect(hasPart(served, 'digit')).toBe(true)
    expect(hasPart(served, 'strip')).toBe(true)
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-sliding-number')).toEqual([])
  })
})
