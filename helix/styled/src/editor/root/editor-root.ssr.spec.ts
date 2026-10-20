import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled editor server output', () => {
  const markup = ssr(
    html`<helix-editor label="Release notes" fill separation="plain"></helix-editor>`,
  )

  test('serves the frame as the headless tier does', () => {
    expect(partTag(markup, 'region')).toContain('aria-label="Release notes"')
    expect(partTag(markup, 'bold')).toContain('label="Bold"')
  })

  test('draws the block menu button among the tools', () => {
    expect(partTag(markup, 'block')).toContain('emphasis="ghost"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-editor')).toEqual(['fill', 'label', 'separation'])
  })
})
