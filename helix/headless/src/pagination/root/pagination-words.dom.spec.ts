import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { label, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Pagination on the words registry, with its size and summary parts: their
 * words come from `registerWords` for the page's language, and every number
 * is written in that language, read from the nearest `lang` as well as from
 * `locale`.
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

const mounted = async (around: string, markup: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}>${markup}</div>`
  const host = document.body.firstElementChild?.firstElementChild as Updatable
  await settle(host)
  return host
}

const GERMAN = {
  'helix-pagination': {
    fallbackLabel: 'Seitennavigation',
    nextLabel: 'Nächste Seite',
    pageLabel: 'Seite {page} von {pages}',
    statusLabel: '{page} von {pages}',
  },
  'helix-pagination-size': { fallbackLabel: 'Pro Seite' },
  'helix-pagination-summary': { format: '{from}–{to} von {total}' },
}

describe('pagination on a page in another language', () => {
  test('names its landmark and its controls in the registered words, its numbers in the language', async () => {
    registerWords('de', GERMAN)
    const nav = await mounted(
      'lang="de"',
      '<helix-headless-pagination default-page="1" pages="1234"></helix-headless-pagination>',
    )
    expect(label(nav)).toBe('Seitennavigation')
    expect(part(nav, 'next')?.getAttribute('aria-label')).toBe('Nächste Seite')
    const pages = [...(nav.shadowRoot?.querySelectorAll('[part~="page"]') ?? [])]
    const last = pages.at(-1)
    /* Before, the nearest `lang` did not reach the numbers: "1,234". */
    expect(last?.textContent?.trim()).toBe('1.234')
    expect(last?.getAttribute('aria-label')).toBe('Seite 1.234 von 1.234')
  })

  test('writes its compact reading in the registered words', async () => {
    registerWords('de', GERMAN)
    const nav = await mounted(
      'lang="de"',
      '<helix-headless-pagination compact default-page="2" pages="1200"></helix-headless-pagination>',
    )
    expect(part(nav, 'status')?.textContent?.trim()).toBe('2 von 1.200')
  })

  test('a summary reads in the registered words, its numbers in the language', async () => {
    registerWords('de', GERMAN)
    const summary = await mounted(
      'lang="de"',
      '<helix-headless-pagination-summary page="2" page-size="1000" total="2480"></helix-headless-pagination-summary>',
    )
    expect(summary.shadowRoot?.textContent?.trim()).toBe('1.001–2.000 von 2.480')
    const english = await mounted(
      '',
      '<helix-headless-pagination-summary page="2" page-size="1000" total="2480"></helix-headless-pagination-summary>',
    )
    expect(english.shadowRoot?.textContent?.trim()).toBe('1,001-2,000 of 2,480')
  })

  test('a size control reads its label in the registered words', async () => {
    registerWords('de', GERMAN)
    const size = (await mounted(
      'lang="de"',
      '<helix-headless-pagination-size></helix-headless-pagination-size>',
    )) as HTMLElement & { fallbackLabel: string }
    expect(size.fallbackLabel).toBe('Pro Seite')
  })
})
