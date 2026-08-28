import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-headless-list label="Files">
    <helix-headless-list-item><span>One</span></helix-headless-list-item>
    <helix-headless-list-item><span>Two</span></helix-headless-list-item>
  </helix-headless-list>`

describe('list', () => {
  test('is a list, so the rows are counted rather than read as loose passages', async () => {
    const list = await mount(markup)
    expect(role(list)).toBe('list')
    expect(list.hasAttribute('role')).toBe(false)
    for (const item of list.children) {
      expect(role(item as HTMLElement)).toBe('listitem')
    }
  })

  test('a row never becomes a link', async () => {
    // A router renders its own anchor and cannot render it inside this shadow
    // root, so a row that navigated would force a full page load. The label is
    // the target instead.
    const list = await mount(markup)
    const item = list.children[0] as HTMLElement
    expect(item.shadowRoot?.querySelector('a')).toBeNull()
    expect(slotted(item)[0]?.textContent).toBe('One')
  })
})
