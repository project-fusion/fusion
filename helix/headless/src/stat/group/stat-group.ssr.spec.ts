import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('stat group server output', () => {
  test('the host carries only what the consumer wrote', () => {
    const markup = ssr(html`<helix-base-stat-group label="Scale">x</helix-base-stat-group>`)
    expect(hostAttributes(markup, 'helix-base-stat-group')).toEqual(['label'])
  })
})
