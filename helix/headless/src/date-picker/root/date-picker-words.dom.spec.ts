import '@fusion.dev/helix-testing/dom/register'
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
 * Date Picker on the words registry: its control names and the sentences it
 * raises come from `registerWords` for the page's language.
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

const picker = async (around: string, attrs: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-date-picker ${attrs}></helix-headless-date-picker></div>`
  const host = document.querySelector('helix-headless-date-picker') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('a date picker on a page in another language', () => {
  test('names its controls in the words registered for the nearest `lang`', async () => {
    registerWords('pl', {
      'helix-date-picker': { fallbackLabel: 'Kalendarz', nextLabel: 'Następny miesiąc' },
    })
    const host = await picker('lang="pl"', 'default-month="2026-01"')
    expect(part(host, 'next')?.getAttribute('aria-label')).toBe('Następny miesiąc')
    expect((host as unknown as { internals: ElementInternals }).internals.ariaLabel).toBe(
      'Kalendarz',
    )
  })

  test('raises the registered sentences, with the bound written as the language writes a date', async () => {
    registerWords('de', {
      'helix-date-picker': { rangeUnderflowMessage: 'Wähle ein Datum ab dem {min}.' },
    })
    const host = await picker('lang="de"', 'min="2026-03-10" value="2026-03-01"')
    expect(bubble(host)).toBe('Wähle ein Datum ab dem 10. März 2026.')
  })

  /* It named a pattern token, "Enter a date as YYYY-MM-DD.". */
  test('says the sentence for its mode where a value is no date, with a date in words', async () => {
    expect(bubble(await picker('', 'locale="en-US" value="not-a-date"'))).toBe(
      'Enter a date such as August 24, 2026.',
    )
    expect(bubble(await picker('lang="de"', 'mode="multiple" value="not-a-date"'))).toBe(
      'Enter dates such as 24. August 2026, separated by commas.',
    )
  })

  test('names a month with its year in one format', async () => {
    const host = await picker('', 'default-month="2026-01" view="month"')
    const names = [...(host.shadowRoot?.querySelectorAll('[part~="period"]') ?? [])].map((one) =>
      one.getAttribute('aria-label'),
    )
    expect(names.slice(0, 2)).toEqual(['Jan 2026', 'Feb 2026'])
  })
})
