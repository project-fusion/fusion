import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled terminal server output', () => {
  const markup = ssr(html`<helix-terminal label="zsh" fill separation="plain"></helix-terminal>`)

  test('serves the frame as the headless tier does', () => {
    expect(partTag(markup, 'region')).toContain('aria-label="zsh"')
    expect(partTag(markup, 'find')).toContain('aria-label="Find"')
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(markup, 'helix-terminal')).toEqual(['fill', 'label', 'separation'])
  })
})
