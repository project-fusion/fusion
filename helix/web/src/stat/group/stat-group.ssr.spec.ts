import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat group server output', () => {
  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-stat-group label="Scale">x</helix-stat-group>`)
    expect(hostAttributes(markup, 'helix-stat-group')).toEqual(['label'])
  })
})
