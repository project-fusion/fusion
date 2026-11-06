import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('selection bar server output', () => {
  const markup = ssr(
    html`<helix-headless-selection-bar slot="selection"></helix-headless-selection-bar>`,
  )

  test('serves the count, the actions, and Clear', () => {
    expect(partTag(markup, 'count')).toContain('part="count"')
    expect(partTag(markup, 'clear')).toContain('type="button"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-selection-bar')).toEqual(['slot'])
  })
})
