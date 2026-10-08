import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Time Picker on the words registry: its name and its sentences. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const picker = async (around: string, attrs = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-time-picker ${attrs}></helix-headless-time-picker></div>`
  const host = document.querySelector('helix-headless-time-picker') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('a time picker on a page in another language', () => {
  test('is named in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-time-picker': { label: 'Godzina' } })
    const host = await picker('lang="pl"')
    expect(part(host, 'list')?.getAttribute('aria-label')).toBe('Godzina')
  })

  /* It named a pattern token, "Enter a time as HH:mm.", to a reader whose list
     showed `2:30 PM`. */
  test('says the sentence for its mode where a value is no time, with a time as it shows one', async () => {
    expect(bubble(await picker('', 'value="nope" locale="en-US"'))).toBe(
      'Enter a time such as 2:30 PM.',
    )
    expect(bubble(await picker('', 'value="nope" locale="de-DE" seconds mode="multiple"'))).toBe(
      'Enter times such as 14:30:15, separated by commas.',
    )
    registerWords('pl', {
      'helix-time-picker': {
        badInputMessage:
          '{mode, select, single {Wpisz godzinę jako {shape}.} other {Wpisz godziny jako {shape}.}}',
      },
    })
    expect(bubble(await picker('lang="pl"', 'value="nope"'))).toBe('Wpisz godzinę jako HH:mm.')
  })
})
