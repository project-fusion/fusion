import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Listbox's count is one plural message, picked by the rules of the nearest
 * `lang`: a list on a Polish page read only its own `lang` and counted with
 * the browser's English rules.
 */
beforeAll(async () => {
  registerDom()
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
