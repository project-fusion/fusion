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
 * Listbox's count is one plural message, picked by the rules of the nearest
 * `lang`: a list on a Polish page read only its own `lang` and counted with
 * the browser's English rules.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Filtered = Updatable & { requestFilter: (next: string) => boolean }

const POLISH = '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}'

const counted = async (around: string, extra: string, filter: string): Promise<string> => {
  document.body.innerHTML = `<div ${around}><helix-headless-listbox label="L" filterable ${extra}>
    <helix-headless-option value="1">Rust</helix-headless-option>
    <helix-headless-option value="2">Ruby</helix-headless-option>
    <helix-headless-option value="3">Go</helix-headless-option>
  </helix-headless-listbox></div>`
  const host = document.querySelector('helix-headless-listbox') as Filtered
  await settle(host)
  host.requestFilter(filter)
  await settle(host)
  return part(host, 'live')?.textContent?.trim() ?? ''
}

describe('the count a listbox says', () => {
  test('is one plural message, in English by default', async () => {
    expect(await counted('', '', 'r')).toBe('2 results')
    expect(await counted('', '', 'go')).toBe('1 result')
  })

  test('picks the form the nearest `lang` has', async () => {
    expect(await counted('lang="pl"', `results-label="${POLISH}"`, 'r')).toBe('2 wyniki')
    expect(await counted('lang="pl"', `results-label="${POLISH}"`, 'go')).toBe('1 wynik')
  })

  test('still takes the deprecated sentence for one, where a page sets it', async () => {
    expect(await counted('', 'result-label="Just {count}"', 'go')).toBe('Just 1')
  })
})

describe('the words a listbox says', () => {
  test('are the words registered for the nearest `lang`, under its key', async () => {
    registerWords('de', {
      'helix-listbox': {
        emptyText: 'Keine Treffer',
        filterLabel: 'Filtern',
        resultsLabel: '{count, plural, one {# Treffer} other {# Treffer}}',
        valueMissingMessage: 'Bitte eine wählen.',
      },
    })
    document.body.innerHTML = `<div lang="de"><helix-headless-listbox label="L" filterable required>
      <helix-headless-option value="1">Rust</helix-headless-option>
      <helix-headless-option value="2">Ruby</helix-headless-option>
    </helix-headless-listbox></div>`
    const host = document.querySelector('helix-headless-listbox') as Filtered & {
      validationMessage: string
    }
    await settle(host)
    expect(part(host, 'search-field')?.getAttribute('aria-label')).toBe('Filtern')
    expect(host.validationMessage).toBe('Bitte eine wählen.')
    host.requestFilter('r')
    await settle(host)
    expect(part(host, 'live')?.textContent?.trim()).toBe('2 Treffer')
    host.requestFilter('zz')
    await settle(host)
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Keine Treffer')
  })

  test('keep their English where nothing is registered', async () => {
    document.body.innerHTML = `<helix-headless-listbox label="L" required>
      <helix-headless-option value="1">Rust</helix-headless-option>
    </helix-headless-listbox>`
    const host = document.querySelector('helix-headless-listbox') as Filtered & {
      validationMessage: string
    }
    await settle(host)
    expect(host.validationMessage).toBe('Choose one to continue.')
  })
})
