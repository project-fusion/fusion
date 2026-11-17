import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('rotating text server output', () => {
  const served = ssr(
    html`<helix-rotating-text><span>faster</span><span>simpler</span></helix-rotating-text>`,
  )

  test('serves a slot for the words, which the page keeps', () => {
    expect(rendered(served, 'helix-rotating-text')).toContain('<slot')
  })

  test('the host carries nothing the page did not write', () => {
    expect(hostAttributes(served, 'helix-rotating-text')).toEqual([])
  })
})
