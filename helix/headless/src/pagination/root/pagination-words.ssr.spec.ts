import { afterEach, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A server knows an element's own attributes and the words the process
 * registered, so a pagination with its own `lang` is served in that language,
 * words and numbers alike, and one without it is served in English.
 */
afterEach(() => {
  clearWords()
})

describe('pagination served in a language', () => {
  test('reads its own `lang` for its words and its numbers', () => {
    registerWords('de', {
      'helix-pagination': { nextLabel: 'Nächste Seite', pageLabel: 'Seite {page}' },
    })
    const served = ssr(
      html`<helix-headless-pagination lang="de" pages="1234" default-page="1234"></helix-headless-pagination>`,
    )
    expect(partTag(served, 'next')).toContain('aria-label="Nächste Seite"')
    expect(partTag(served, 'page-current')).toContain('aria-label="Seite 1.234"')
  })

  test('is served in English without one', () => {
    registerWords('de', { 'helix-pagination': { nextLabel: 'Nächste Seite' } })
    const served = ssr(
      html`<helix-headless-pagination pages="1234" default-page="1234"></helix-headless-pagination>`,
    )
    expect(partTag(served, 'next')).toContain('aria-label="Next page"')
    expect(partTag(served, 'page-current')).toContain('aria-label="Page 1,234"')
  })
})
