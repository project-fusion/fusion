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

/** Date Input on the words registry: its placeholder, its trigger and its sentences. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const field = async (around: string, attrs = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-date-input label="Data" ${attrs}></helix-headless-date-input></div>`
  const host = document.querySelector('helix-headless-date-input') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('a date input on a page in another language', () => {
  test('names its trigger and raises its sentences in the registered words', async () => {
    registerWords('pl', {
      'helix-date-input': {
        triggerLabel: 'Wybierz datę',
        unavailableMessage: 'Ta data jest niedostępna.',
      },
    })
    const host = await field('lang="pl"', 'value="2026-03-10" disable-dates="2026-03-10"')
    expect(part(host, 'trigger')?.getAttribute('aria-label')).toBe('Wybierz datę')
    expect(bubble(host)).toBe('Ta data jest niedostępna.')
  })

  test('raises the English it always raised', async () => {
    expect(bubble(await field('', 'value="2026-03-10" disable-dates="2026-03-10"'))).toBe(
      'Choose a date that is available.',
    )
  })

  test('hands its calendar a `locale` only where the page names a language', async () => {
    const english = await field('', 'default-open')
    expect(part(english, 'picker')?.hasAttribute('locale')).toBe(false)
    const polish = await field('lang="pl"', 'default-open')
    expect(part(polish, 'picker')?.getAttribute('locale')).toBe('pl')
  })
})
