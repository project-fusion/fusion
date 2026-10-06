import { afterEach, describe, expect, test } from 'bun:test'
import { rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { getWindow } from '@lit-labs/ssr/lib/dom-shim.js'
import { html, LitElement } from 'lit'
import { property } from 'lit/decorators.js'
import { clearWords, registerWords, setDefaultWordsLocale } from './registry.js'
import { formatWords, words } from './words.js'
import { wordsLocale } from './words-locale.js'

const shim = getWindow({}) as unknown as { HTMLElement: typeof HTMLElement }

/**
 * What a server draws. It knows the element's own attributes and the words the
 * process registered, and nothing around the element, so a word resolves in
 * the element's `locale`, its own `lang`, the default, then English.
 */
class ServedProbe extends LitElement {
  static words = 'helix-served'

  @property()
  locale = ''

  /** What a screen reader hears for a count. */
  @words
  @property({ attribute: 'results-label' })
  resultsLabel = '{count, plural, one {# result} other {# results}}'

  protected override render(): unknown {
    return html`<p>${formatWords(this, 'resultsLabel', { count: 5 })}</p>`
  }
}
customElements.define('words-served', ServedProbe)

afterEach(() => {
  clearWords()
  setDefaultWordsLocale('en')
})

/** The probe's paragraph, as served. */
const served = (markup: string): string =>
  /<p>(?:<!--[^>]*-->)*([^<]*)/.exec(rendered(markup, 'words-served'))?.[1] ?? ''

const polish = {
  'helix-served': {
    resultsLabel: '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}',
  },
}

describe('a server render', () => {
  test('is English where nothing says otherwise', () => {
    registerWords('pl', polish)
    expect(served(ssr(html`<words-served></words-served>`))).toBe('5 results')
  })

  test('reads the element’s own `lang`', () => {
    registerWords('pl', polish)
    expect(served(ssr(html`<words-served lang="pl"></words-served>`))).toBe('5 wyników')
  })

  test('reads the `locale` property before the `lang`', () => {
    registerWords('pl', polish)
    expect(served(ssr(html`<words-served lang="de" locale="pl"></words-served>`))).toBe('5 wyników')
  })

  test('reads the default a server sets, for a process that renders one language', () => {
    /* On the shim a server renders with, which has no `closest`: this file
       can share a process with the DOM specs, whose globals a render would
       otherwise meet. */
    const element = new shim.HTMLElement()
    setDefaultWordsLocale('pl')
    expect(wordsLocale(element)).toBe('pl')
    element.setAttribute('lang', 'de')
    expect(wordsLocale(element)).toBe('de')
  })

  test('keeps two languages in one process apart, holding no current locale', () => {
    registerWords('pl', polish)
    /* One render after another in one process, as two requests are. */
    expect([
      served(ssr(html`<words-served lang="pl"></words-served>`)),
      served(ssr(html`<words-served lang="en"></words-served>`)),
      served(ssr(html`<words-served lang="pl"></words-served>`)),
    ]).toEqual(['5 wyników', '5 results', '5 wyników'])
  })
})
