import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const bar = `<helix-base-navigation label="Sections">
  <a aria-current="page" data-navigation-item href="/design">Design</a>
  <a data-navigation-item href="/mind">Mind</a>
</helix-base-navigation>`

describe('nav bar', () => {
  test('wraps its links in a named landmark', async () => {
    const nav = await mount(bar)
    expect(part(nav, 'nav')?.tagName).toBe('NAV')
    expect(part(nav, 'nav')?.getAttribute('aria-label')).toBe('Sections')
  })

  test('the indicator is hidden from assistive technology', async () => {
    // It is a moving mark that repeats what `aria-current` already says.
    const nav = await mount(bar)
    expect(part(nav, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })

  test("the current item is the consumer's `aria-current`, not a copy of it", async () => {
    // Marking it twice would let the two drift, and `aria-current` is what
    // navigation actually uses.
    const nav = await mount(bar)
    const current = nav.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute('href')).toBe('/design')
  })
})
