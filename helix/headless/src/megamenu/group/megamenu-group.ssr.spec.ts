import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-headless-megamenu-group label="Work">
  <helix-headless-megamenu-item href="/projects">Projects</helix-headless-megamenu-item>
</helix-headless-megamenu-group>`

describe('megamenu group server output', () => {
  test('the group and its heading are served, the group named by the heading', () => {
    const served = ssr(group)
    expect(partTag(served, 'group')).toContain('role="group"')
    expect(partTag(served, 'group')).toContain('aria-labelledby="label"')
    expect(partTag(served, 'label')).toContain('aria-level="3"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-megamenu-group')).toEqual(['label'])
  })
})
