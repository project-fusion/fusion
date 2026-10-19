import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The `@words` decorator on a real Lit element, since what matters is what
 * Lit's machinery does with it: the initializer through the setter, an
 * attribute through the converter, and an update with each changed word named.
 */
type Probe = HTMLElement & {
  changed: string[]
  requestUpdate: (name?: PropertyKey, before?: unknown) => void
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

  /** One with a validation message, which is never empty. */
  class MessageProbe extends LitElement {
    static words = 'helix-message-probe'

    /** What a field reports when its value is past the end. */
    @decorate
    @property({ attribute: 'range-overflow-message' })
    rangeOverflowMessage = 'Too far.'

    /** What the field is called. */
    @decorate
    @property()
    label = 'Field'
  }
  customElements.define('words-message', MessageProbe)
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

describe('a word a mixin declares', () => {
  /* A mixin's words resolve under its host's key, and a family that rewords
     one declares its own English: Tag's "Remove {label}" over "Dismiss". */
  const define = async (): Promise<void> => {
    if (customElements.get('words-mixed')) {
      return
    }
    const { LitElement } = await import('lit')
    const { property } = await import('lit/decorators.js')
    // biome-ignore lint/suspicious/noExplicitAny: a mixin's constructor is variadic.
    const Mixin = <T extends new (...args: any[]) => InstanceType<typeof LitElement>>(Base: T) => {
      class Dismissing extends Base {
        static words = ''

        @words.words
        @property({ attribute: 'dismiss-label' })
        dismissLabel = 'Dismiss'
      }
      return Dismissing
    }
    class Mixed extends Mixin(LitElement) {
      static override words = 'helix-mixed'
    }
    class Reworded extends Mixin(LitElement) {
      static override words = 'helix-reworded'

      @words.words
      @property({ attribute: 'dismiss-label' })
      override dismissLabel = 'Remove'
    }
    class Keyless extends Mixin(LitElement) {}
    customElements.define('words-mixed', Mixed)
    customElements.define('words-reworded', Reworded)
    customElements.define('words-keyless', Keyless)
  }
  type Dismissing = Probe & { dismissLabel: string | null }

  test("resolves under its host's key, or its tag where the host names none", async () => {
    await define()
    registry.registerWords('de', {
      'helix-mixed': { dismissLabel: 'Schließen' },
      'words-keyless': { dismissLabel: 'Ausblenden' },
    })
    const mixed = (await mount(
      '<div lang="de"><words-mixed></words-mixed></div>',
      'words-mixed',
    )) as Dismissing
    expect(mixed.dismissLabel).toBe('Schließen')
    const keyless = (await mount(
      '<div lang="de"><words-keyless></words-keyless></div>',
      'words-keyless',
    )) as Dismissing
    expect(keyless.dismissLabel).toBe('Ausblenden')
  })

  test('takes the English of the family that rewords it, which the registry replaces', async () => {
    await define()
    const host = (await mount('<words-reworded></words-reworded>', 'words-reworded')) as Dismissing
    expect(host.dismissLabel).toBe('Remove')
    registry.registerWords('de', { 'helix-reworded': { dismissLabel: 'Entfernen' } })
    document.documentElement.setAttribute('lang', 'de')
    await updated(host)
    expect(host.dismissLabel).toBe('Entfernen')
    host.dismissLabel = 'Weg damit'
    expect(host.dismissLabel).toBe('Weg damit')
    host.dismissLabel = null
    expect(String(host.dismissLabel)).toBe('Entfernen')
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

  test('writes its numbers in a new `lang` though none of its words changed', async () => {
    const probe = await mount('<div><words-probe></words-probe></div>')
    expect(drawn(probe)[1]).toBe('1,200 results')
    probe.parentElement?.setAttribute('lang', 'de')
    registry.refreshWords()
    await updated(probe)
    expect(drawn(probe)[1]).toBe('1.200 results')
    probe.parentElement?.removeAttribute('lang')
    registry.refreshWords()
    await updated(probe)
    expect(drawn(probe)[1]).toBe('1,200 results')
  })

  test('reads an empty validation message as unset, and keeps any other empty word', async () => {
    registry.registerWords('de', { 'helix-message-probe': { rangeOverflowMessage: 'Zu weit.' } })
    document.body.innerHTML =
      '<words-message range-overflow-message="" label=""></words-message><div lang="de"><words-message range-overflow-message=""></words-message></div>'
    const [english, german] = [...document.querySelectorAll('words-message')] as (HTMLElement & {
      label: string
      rangeOverflowMessage: string
    })[]
    expect(english?.rangeOverflowMessage).toBe('Too far.')
    expect(english?.label).toBe('')
    expect(german?.rangeOverflowMessage).toBe('Zu weit.')
  })

  /* **Nothing is worked out until something changes.** An element records
     what its locale is worked out from as it connects, the `locale` it was
     given and the `lang` written nearest it, and works the locale out only
     where a change moves them. The first `DateTimeFormat` a page makes for the
     runtime's own locale costs 7.1 ms in Chromium, and the first element of
     any kind paid it. */
  test('works out no locale as an element connects', async () => {
    const made: string[] = []
    const real = {
      DateTimeFormat: Intl.DateTimeFormat,
      Locale: Intl.Locale,
      PluralRules: Intl.PluralRules,
    }
    for (const [name, Made] of Object.entries(real)) {
      Object.assign(Intl, {
        [name]: new Proxy(Made, {
          construct: (target, args) => {
            made.push(name)
            return Reflect.construct(target, args)
          },
        }),
      })
    }
    try {
      document.body.innerHTML = '<div lang="de"><words-message></words-message></div>'
      await (document.querySelector('words-message') as Probe).updateComplete
    } finally {
      Object.assign(Intl, real)
    }
    expect(made).toEqual([])
  })

  /* The reads differ and the locale does not: `en` in a runtime that speaks
     English is the runtime's own locale, which is the one `en-US` names here. */
  test('updates only where a new `lang` moves its locale', async () => {
    const own = new Intl.DateTimeFormat().resolvedOptions().locale
    const probe = await mount(
      `<div lang="${new Intl.Locale(own).language}"><words-probe></words-probe></div>`,
    )
    let asked = 0
    const request = probe.requestUpdate.bind(probe)
    probe.requestUpdate = (...args: Parameters<typeof request>) => {
      asked += 1
      request(...args)
    }
    probe.parentElement?.setAttribute('lang', own)
    registry.refreshWords()
    await updated(probe)
    expect(asked).toBe(0)
    probe.parentElement?.setAttribute('lang', 'de')
    registry.refreshWords()
    await updated(probe)
    expect(asked).toBe(1)
    expect(drawn(probe)[1]).toBe('1.200 results')
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
