import { describe, expect, test } from 'bun:test'
import { hostAttributes, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('app header server output', () => {
  const served = ssr(
    html`<helix-headless-app-header><span slot="start">Fusion</span></helix-headless-app-header>`,
  )

  /* The banner role goes through internals, and the server cannot read the
     ancestors that would drop it, so the host is served as written. */
  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-headless-app-header')).toEqual([])
  })

  test('serves the row and its three regions', () => {
    expect(servedParts(served)).toEqual(['content', 'end', 'row', 'start'])
  })
})
