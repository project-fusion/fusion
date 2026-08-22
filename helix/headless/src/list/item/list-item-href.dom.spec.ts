import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('list item href', () => {
  test('is a div with nowhere to go', async () => {
    const el = await mount('<helix-list-item>Row</helix-list-item>')
    expect(el.shadowRoot?.querySelector('[part="row"]')?.tagName).toBe('DIV')
  })

  test('becomes the link when given one, and the host stays the list entry', async () => {
    const el = await mount('<helix-list-item href="/a">Row</helix-list-item>')
    const row = el.shadowRoot?.querySelector('[part="row"]') as HTMLAnchorElement
    expect(row.tagName).toBe('A')
    expect(row.getAttribute('href')).toBe('/a')
    // An <a> carrying listitem would be a link claiming to be a list entry.
    expect(row.getAttribute('role')).toBeNull()
  })

  test('writes target and rel only when asked', async () => {
    const bare = await mount('<helix-list-item href="/a">Row</helix-list-item>')
    const row = bare.shadowRoot?.querySelector('[part="row"]') as HTMLAnchorElement
    expect([row.hasAttribute('target'), row.hasAttribute('rel')]).toEqual([false, false])
  })
})
