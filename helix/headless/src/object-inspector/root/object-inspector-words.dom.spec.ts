import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Object Inspector on the words registry: each count is one plural message,
 * written in the language of the page, and the deprecated sentence for one
 * still counts where a page sets it.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Inspector = Updatable & { filter: string; value: unknown }

const VALUE = { list: [1, 2, 3, 4, 5], one: { only: true }, two: { a: 1, b: 2 } }

const inspector = async (around = '', extra = ''): Promise<Inspector> => {
  document.body.innerHTML = `<div ${around}><helix-headless-object-inspector filterable ${extra}></helix-headless-object-inspector></div>`
  const host = document.querySelector('helix-headless-object-inspector') as Inspector
  host.value = VALUE
  await settle(host)
  return host
}

const counts = (host: HTMLElement): (string | undefined)[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="count"]') ?? [])].map((one) =>
    one.textContent?.trim(),
  )

const said = async (host: Inspector, filter: string): Promise<string | undefined> => {
  host.filter = filter
  await host.updateComplete
  await new Promise((done) => requestAnimationFrame(done))
  await host.updateComplete
  return part(host, 'live')?.textContent?.trim()
}

const POLISH = {
  'helix-object-inspector': {
    filterLabel: 'Filtruj',
    itemsLabel:
      '{count, plural, one {# element} few {# elementy} many {# elementów} other {# elementu}}',
    keysLabel: '{count, plural, one {# klucz} few {# klucze} many {# kluczy} other {# klucza}}',
    resultsLabel: '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}',
  },
}

describe('an object inspector on a page in another language', () => {
  test('counts keys and items with the language’s own forms', async () => {
    registerWords('pl', POLISH)
    const host = await inspector('lang="pl"')
    expect(counts(host)).toEqual(['3 klucze', '5 elementów', '1 klucz', '2 klucze'])
  })

  test('says how many entries a filter matched in them', async () => {
    registerWords('pl', POLISH)
    const host = await inspector('lang="pl"')
    expect(await said(host, 'only')).toBe('1 wynik')
  })

  test('names its filter with the words registered for it', async () => {
    registerWords('pl', POLISH)
    const host = await inspector('lang="pl"')
    expect(part(host, 'search-field')?.getAttribute('aria-label')).toBe('Filtruj')
  })
})

describe('the counts an object inspector says in English', () => {
  test('are as before', async () => {
    const host = await inspector()
    expect(counts(host)).toEqual(['3 keys', '5 items', '1 key', '2 keys'])
  })

  test('still take the deprecated sentence for one, where a page sets it', async () => {
    const host = await inspector('', 'key-label="just {count} key"')
    expect(counts(host)).toEqual(['3 keys', '5 items', 'just 1 key', '2 keys'])
  })
})
