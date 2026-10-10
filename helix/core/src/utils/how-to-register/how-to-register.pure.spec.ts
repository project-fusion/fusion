import { describe, expect, test } from 'bun:test'
import { howToRegister } from './how-to-register.js'

describe('how to register an element nobody registered', () => {
  test('names the entry to import on our tiers', () => {
    expect(
      howToRegister({ entry: 'option', host: 'helix-select', tag: 'helix-option', tier: 'helix-' }),
    ).toBe("Import '@fusion.dev/helix/option'.")
    expect(
      howToRegister({
        entry: 'filter-input/menu',
        host: 'helix-headless-filter-input',
        tag: 'helix-headless-filter-menu',
        tier: 'helix-headless-',
      }),
    ).toBe("Import '@fusion.dev/helix-headless/filter-input/menu'.")
  })

  /* No entry of ours registers `acme-option`: the page that subclassed the
     host defines the tags it holds too. */
  test('and the tag to define on a tier of your own', () => {
    expect(
      howToRegister({ entry: 'option', host: 'acme-select', tag: 'acme-option', tier: 'acme-' }),
    ).toBe('Define <acme-option> as you defined <acme-select>.')
  })
})
