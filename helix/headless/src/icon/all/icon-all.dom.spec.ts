import { beforeAll, describe, expect, test } from 'bun:test'
import { icons } from '@fusion.dev/helix-icons'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

describe('the names the entries register', () => {
  test('the family entry registers every glyph of the set', async () => {
    const { resolveIcon } = await import('../index.js')
    for (const [name, glyph] of Object.entries(icons)) {
      expect(resolveIcon(name)).toBe(glyph)
    }
  })

  test('and icon/all is the same entry', async () => {
    const all = await import('./index.js')
    const family = await import('../index.js')
    expect(all.resolveIcon).toBe(family.resolveIcon)
    for (const [name, glyph] of Object.entries(icons)) {
      expect(all.resolveIcon(name)).toBe(glyph)
    }
  })
})
