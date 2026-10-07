import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * What a server draws. It knows the element's own attributes and the words the
 * process registered, and nothing around the element, so a word resolves in
 * the element's `locale`, its own `lang`, the default, then English.
 *
 * **Lit loads after the DOM is registered**, as in every DOM spec: this file
 * shares a process with them, and Lit keeps the `document` it finds when it
 * loads, so a Lit loaded first would build every later spec's elements on a
 * stand-in with no `createComment`.
 */
let ssr: typeof import('@fusion.dev/helix-testing/ssr').ssr
let rendered: typeof import('@fusion.dev/helix-testing/ssr').rendered
let html: typeof import('lit').html
let registry: typeof import('./registry.js')
let wordsLocale: typeof import('./words-locale.js').wordsLocale
let shim: { HTMLElement: typeof HTMLElement }

beforeAll(async () => {
  registerDom()
  ;({ rendered, ssr } = await import('@fusion.dev/helix-testing/ssr'))
  const { getWindow } = await import('@lit-labs/ssr/lib/dom-shim.js')
  shim = getWindow({}) as unknown as { HTMLElement: typeof HTMLElement }
  const lit = await import('lit')
  html = lit.html
  const { property } = await import('lit/decorators.js')
  registry = await import('./registry.js')
  ;({ wordsLocale } = await import('./words-locale.js'))
  const { formatWords, words } = await import('./words.js')

  class ServedProbe extends lit.LitElement {
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
})

afterEach(() => {
  registry.clearWords()
  registry.setDefaultWordsLocale('en')
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
    registry.registerWords('pl', polish)
    expect(served(ssr(html`<words-served></words-served>`))).toBe('5 results')
  })

  test('reads the element’s own `lang`', () => {
    registry.registerWords('pl', polish)
    expect(served(ssr(html`<words-served lang="pl"></words-served>`))).toBe('5 wyników')
  })

  test('reads the `locale` property before the `lang`', () => {
    registry.registerWords('pl', polish)
    expect(served(ssr(html`<words-served lang="de" locale="pl"></words-served>`))).toBe('5 wyników')
  })

  test('reads the default a server sets, for a process that renders one language', () => {
    /* On the shim a server renders with, which has no `closest`: this file
       can share a process with the DOM specs, whose globals a render would
       otherwise meet. */
    const element = new shim.HTMLElement()
    registry.setDefaultWordsLocale('pl')
    expect(wordsLocale(element)).toBe('pl')
    element.setAttribute('lang', 'de')
    expect(wordsLocale(element)).toBe('de')
  })

  test('keeps two languages in one process apart, holding no current locale', () => {
    registry.registerWords('pl', polish)
    /* One render after another in one process, as two requests are. */
    expect([
      served(ssr(html`<words-served lang="pl"></words-served>`)),
      served(ssr(html`<words-served lang="en"></words-served>`)),
      served(ssr(html`<words-served lang="pl"></words-served>`)),
    ]).toEqual(['5 wyników', '5 results', '5 wyników'])
  })
})
