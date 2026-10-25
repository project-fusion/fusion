import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import {
  internalsOf,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/** Time Picker on the words registry: its name and its sentences. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
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

const bubble = (host: HTMLElement): string => internalsOf(host).validationMessage

describe('a time picker on a page in another language', () => {
  test('is named in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-time-picker': { fallbackLabel: 'Godzina' } })
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
