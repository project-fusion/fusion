import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The `@words` decorator on a real Lit element, since what matters is what
 * Lit's machinery does with it: the initializer through the setter, an
 * attribute through the converter, and an update with each changed word named.
 */
type Probe = HTMLElement & {
  changed: string[]
  emptyText: string | null
  locale: string
  resultsLabel: string | null
  updateComplete: Promise<boolean>
}

let words: typeof import('./words.js')
let registry: typeof import('./registry.js')
let wordsLocale: typeof import('./words-locale.js').wordsLocale
let handedLocale: typeof import('./words-locale.js').handedLocale

beforeAll(async () => {
  registerDom()
  const { LitElement, html } = await import('lit')
  const { property } = await import('lit/decorators.js')
  words = await import('./words.js')
  registry = await import('./registry.js')
  ;({ handedLocale, wordsLocale } = await import('./words-locale.js'))
  const { formatWords } = words
  const decorate = words.words

  class WordsProbe extends LitElement {
    static words = 'helix-probe'

    changed: string[] = []

    /** Text shown when nothing matches. */
    @decorate
    @property({ attribute: 'empty-text' })
    emptyText = 'No matches'

    @property()
    locale = ''

    /** What a screen reader hears for a count. */
    @decorate
    @property({ attribute: 'results-label' })
    resultsLabel = '{count, plural, one {# result} other {# results}}'

    protected override willUpdate(changed: Map<string, unknown>): void {
      this.changed.push(...[...changed.keys()].map(String))
    }

    protected override render(): unknown {
      return html`<p>${this.emptyText}</p>
        <span>${formatWords(this, 'resultsLabel', { count: 1200 })}</span>`
    }
  }
  customElements.define('words-probe', WordsProbe)

  /** One that hydrated a server's markup in its first render. */
  class HydratingProbe extends WordsProbe {
    get hydrating(): boolean {
      return !this.hasUpdated
    }
  }
  customElements.define('words-hydrating', HydratingProbe)
})

afterEach(() => {
  registry.clearWords()
  registry.setDefaultWordsLocale('en')
  document.documentElement.removeAttribute('lang')
  document.body.innerHTML = ''
})

const mount = async (markup: string, tag = 'words-probe'): Promise<Probe> => {
  document.body.innerHTML = markup
  const probe = document.querySelector(tag) as Probe
  await probe.updateComplete
  return probe
}

/** What the probe drew: its paragraph, then its count. */
const drawn = (probe: Probe): string[] =>
  [...(probe.shadowRoot?.querySelectorAll('p, span') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

/** Two turns: the microtask that tells watchers, then the update it asks for. */
const updated = async (probe: Probe): Promise<void> => {
  await Promise.resolve()
  await probe.updateComplete
}

describe('a word property', () => {
  test('reads its English where nothing is registered', async () => {
    const probe = await mount('<words-probe></words-probe>')
    expect(probe.emptyText).toBe('No matches')
    expect(drawn(probe)).toEqual(['No matches', '1,200 results'])
  })

  test('reads the words registered for the nearest `lang`', async () => {
    registry.registerWords('de', {
      'helix-probe': {
        emptyText: 'Keine Treffer',
        resultsLabel: '{count, plural, one {# Ergebnis} other {# Ergebnisse}}',
      },
    })
    const probe = await mount('<div lang="de"><words-probe></words-probe></div>')
    expect(probe.emptyText).toBe('Keine Treffer')
    expect(drawn(probe)).toEqual(['Keine Treffer', '1.200 Ergebnisse'])
  })

  test('reads the `locale` property before any `lang`', async () => {
    registry.registerWords('fr', { 'helix-probe': { emptyText: 'Aucun résultat' } })
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    const probe = await mount('<div lang="de"><words-probe locale="fr"></words-probe></div>')
    expect(probe.emptyText).toBe('Aucun résultat')
  })

  test('falls back to English one word at a time, counting with English rules', async () => {
    /* Polish has a word for "no matches" and none yet for the count, so the
       count is English: its forms are English, and its digits are Polish. */
    registry.registerWords('pl', { 'helix-probe': { emptyText: 'Brak wyników' } })
    const probe = await mount('<div lang="pl"><words-probe></words-probe></div>')
    expect(drawn(probe)).toEqual(['Brak wyników', '1200 results'])
  })

  test('keeps a value you set, the English included, over the registry', async () => {
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    const probe = await mount(
      '<div lang="de"><words-probe empty-text="Nichts gefunden"></words-probe></div>',
    )
    expect(probe.emptyText).toBe('Nichts gefunden')
    probe.emptyText = 'No matches'
    await probe.updateComplete
    expect(drawn(probe)[0]).toBe('No matches')
  })

  test('gives the registry its word back when set to null or the attribute goes', async () => {
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    const probe = await mount(
      '<div lang="de"><words-probe empty-text="Nichts gefunden"></words-probe></div>',
    )
    probe.removeAttribute('empty-text')
    await probe.updateComplete
    expect(drawn(probe)[0]).toBe('Keine Treffer')
    probe.emptyText = 'Leer'
    await probe.updateComplete
    probe.emptyText = null
    await probe.updateComplete
    expect(String(probe.emptyText)).toBe('Keine Treffer')
    expect(drawn(probe)[0]).toBe('Keine Treffer')
  })

  test('takes a value set before the element upgraded as yours', async () => {
    document.body.innerHTML = '<words-late></words-late>'
    const early = document.querySelector('words-late') as Probe
    early.emptyText = 'Set early'
    const { LitElement } = await import('lit')
    const { property } = await import('lit/decorators.js')
    class Late extends LitElement {
      @words.words
      @property({ attribute: 'empty-text' })
      emptyText = 'No matches'
    }
    customElements.define('words-late', Late)
    await (early as Probe).updateComplete
    expect(early.emptyText).toBe('Set early')
  })
})

describe('a page that changes its words', () => {
  test('updates connected elements once, naming each word that changed', async () => {
    const probe = await mount('<div lang="de"><words-probe></words-probe></div>')
    probe.changed = []
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    registry.registerWords('de', { 'helix-probe': { resultsLabel: '{count} Ergebnisse' } })
    await updated(probe)
    expect(drawn(probe)).toEqual(['Keine Treffer', '1.200 Ergebnisse'])
    expect(probe.changed.sort()).toEqual(['emptyText', 'resultsLabel'])
  })

  test('leaves an element alone where its words did not change', async () => {
    const probe = await mount('<div lang="de"><words-probe></words-probe></div>')
    probe.changed = []
    registry.registerWords('fr', { 'helix-probe': { emptyText: 'Aucun résultat' } })
    await updated(probe)
    expect(probe.changed).toEqual([])
  })

  test('updates when the document changes its `lang`', async () => {
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    const probe = await mount('<words-probe></words-probe>')
    document.documentElement.lang = 'de'
    await new Promise((resolve) => setTimeout(resolve, 0))
    await probe.updateComplete
    expect(drawn(probe)[0]).toBe('Keine Treffer')
  })

  test('updates after an ancestor changes its `lang` and `refreshWords` is called', async () => {
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    const probe = await mount('<div><words-probe></words-probe></div>')
    probe.parentElement?.setAttribute('lang', 'de')
    registry.refreshWords()
    await updated(probe)
    expect(drawn(probe)[0]).toBe('Keine Treffer')
  })

  test('stops reaching an element once it leaves the page', async () => {
    const probe = await mount('<div lang="de"><words-probe></words-probe></div>')
    probe.remove()
    probe.changed = []
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    await updated(probe)
    expect(probe.changed).toEqual([])
  })
})

describe('the locale an element speaks', () => {
  test('is the nearest `lang`, read out through a shadow root', () => {
    document.body.innerHTML = '<div lang="de-CH"><div id="host"></div></div>'
    const root = (document.querySelector('#host') as HTMLElement).attachShadow({ mode: 'open' })
    root.innerHTML = '<span id="inside"></span>'
    expect(wordsLocale(root.querySelector('#inside') as Element)).toBe('de-CH')
  })

  test('is a tag `Intl` takes, whatever was written', () => {
    document.body.innerHTML = '<div lang="xx-bad!"><span id="at"></span></div>'
    const at = document.querySelector('#at') as Element & { locale?: string }
    expect(() => new Intl.PluralRules(wordsLocale(at))).not.toThrow()
    at.locale = 'also bad'
    expect(() => new Intl.PluralRules(wordsLocale(at))).not.toThrow()
  })

  test('while hydrating, reads only its own `lang` and the default', () => {
    registry.setDefaultWordsLocale('fr')
    document.body.innerHTML = '<div lang="de"><span id="at"></span><b lang="it"></b></div>'
    const at = Object.assign(document.querySelector('#at') as Element, { hydrating: true })
    expect(wordsLocale(at)).toBe('fr')
    const own = Object.assign(document.querySelector('b') as Element, { hydrating: true })
    expect(wordsLocale(own)).toBe('it')
  })
})

describe('the locale an element hands a child', () => {
  test('is its `locale`, or the nearest `lang`, and empty where nothing says', () => {
    document.body.innerHTML = '<div lang="pl"><span id="in"></span></div><span id="out"></span>'
    const inside = document.querySelector('#in') as Element & { locale?: string }
    expect(handedLocale(inside)).toBe('pl')
    inside.locale = 'de'
    expect(handedLocale(inside)).toBe('de')
    expect(handedLocale(document.querySelector('#out') as Element)).toBe('')
  })

  test('is only its own `locale` while it hydrates', () => {
    document.body.innerHTML = '<div lang="pl"><span id="in"></span></div>'
    const inside = Object.assign(document.querySelector('#in') as Element, { hydrating: true })
    expect(handedLocale(inside)).toBe('')
  })
})

describe('an element hydrating a server render', () => {
  test('draws the server’s words, then the nearest `lang`’s once', async () => {
    /* The server knew no ancestor, so it drew English; the hydrating render
       has to agree, and the update after it speaks the page's language. */
    registry.registerWords('de', { 'helix-probe': { emptyText: 'Keine Treffer' } })
    document.body.innerHTML = '<div lang="de"><words-hydrating></words-hydrating></div>'
    const probe = document.querySelector('words-hydrating') as Probe
    await probe.updateComplete
    expect(drawn(probe)[0]).toBe('No matches')
    await updated(probe)
    expect(drawn(probe)[0]).toBe('Keine Treffer')
  })
})
