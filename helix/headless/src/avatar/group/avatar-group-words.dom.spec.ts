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
 * Avatar Group on the words registry: the count past `max` is one plural
 * message a page registers for its language, its number written and its
 * names listed as that locale writes them.
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

const group = async (around: string, people: string[]): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-avatar-group max="1">${people
    .map((name) => `<helix-headless-avatar name="${name}"></helix-headless-avatar>`)
    .join('')}</helix-headless-avatar-group></div>`
  const host = document.querySelector('helix-headless-avatar-group') as Updatable
  await settle(host)
  return host
}

const overflow = (host: Updatable): string | null | undefined =>
  part(host, 'overflow')?.getAttribute('aria-label')

describe('avatar group words', () => {
  test('in English the count and the names read as before', async () => {
    expect(overflow(await group('', ['Ada', 'Bo', 'Cy', 'Di']))).toBe('3 more: Bo, Cy, Di')
    expect(overflow(await group('', ['Ada', 'Bo']))).toBe('1 more: Bo')
  })

  test('the count takes the plural form registered for the nearest lang', async () => {
    registerWords('pl', {
      'helix-avatar-group': {
        overflowLabel:
          '{count, plural, one {jeszcze # osoba: {names}} few {jeszcze # osoby: {names}} other {jeszcze # osób: {names}}}',
      },
    })
    const listed = new Intl.ListFormat('pl', { style: 'short', type: 'unit' })
    expect(overflow(await group('lang="pl"', ['Ada', 'Bo', 'Cy', 'Di']))).toBe(
      `jeszcze 3 osoby: ${listed.format(['Bo', 'Cy', 'Di'])}`,
    )
    expect(overflow(await group('lang="pl"', ['Ada', 'Bo']))).toBe('jeszcze 1 osoba: Bo')
  })
})
