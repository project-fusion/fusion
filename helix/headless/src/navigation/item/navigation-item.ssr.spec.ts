import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const item = html`<helix-headless-navigation-item current="page" href="/design">
  Design
</helix-headless-navigation-item>`

describe('navigation item server output', () => {
  test('the link is served with its destination and whether it is the page', () => {
    const link = partTag(ssr(item), 'link')
    expect(link).toContain('href="/design"')
    expect(link).toContain('aria-current="page"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(item), 'helix-headless-navigation-item')).toEqual(['current', 'href'])
  })
})
