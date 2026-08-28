import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat group server output', () => {
  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-headless-stat-group label="Scale">x</helix-headless-stat-group>`)
    expect(hostAttributes(markup, 'helix-headless-stat-group')).toEqual(['label'])
  })
})
