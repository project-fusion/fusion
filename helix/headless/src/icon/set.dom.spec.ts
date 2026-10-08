import { beforeAll, describe, expect, test } from 'bun:test'
import { icons } from '@fusion.dev/helix-icons'
import { registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(() => {
  registerDom()
})

/* The thirteen the family's entry registers, written out, so a glyph added to
   or taken from the small set is a change somebody makes here on purpose. */
const SMALL = [
  'arrow-left',
  'arrow-right',
  'caret-down',
  'caret-left',
  'caret-right',
  'caret-up',
  'check',
  'info',
  'magnifying-glass',
  'minus',
  'plus',
  'warning',
  'x',
]

describe('the names the entries register', () => {
  test('the family entry registers the small set', async () => {
    const { resolveIcon } = await import('./index.js')
    for (const name of SMALL) {
      expect(resolveIcon(name)).toBe(icons[name])
    }
  })

  test('and icon/all registers every glyph of the set', async () => {
    const { resolveIcon } = await import('./all/index.js')
    for (const [name, glyph] of Object.entries(icons)) {
      expect(resolveIcon(name)).toBe(glyph)
    }
  })
})
