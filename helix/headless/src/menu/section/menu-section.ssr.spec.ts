import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('menu section server output', () => {
  const served = ssr(
    html`<helix-headless-menu-section label="History"></helix-headless-menu-section>`,
  )

  test('serves the group named by its heading', () => {
    expect(partTag(served, 'section')).toContain('role="group"')
    expect(partTag(served, 'section')).toContain('aria-labelledby="heading"')
    expect(partTag(served, 'heading')).not.toContain('hidden')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-headless-menu-section')).toEqual(['label'])
  })
})
