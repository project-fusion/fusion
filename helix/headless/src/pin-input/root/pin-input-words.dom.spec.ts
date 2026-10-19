import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Pin Input on the words registry: the too-short sentence is one plural
 * message, so a one-character code is no longer "all 1 characters".
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

const pin = async (around: string, attrs: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-pin-input label="L" ${attrs}></helix-headless-pin-input></div>`
  const host = document.querySelector('helix-headless-pin-input') as Updatable
  await settle(host)
  return host
}

const bubble = (host: HTMLElement): string =>
  (host as unknown as { internals: ElementInternals }).internals.validationMessage

describe('the sentence a pin input raises for a short code', () => {
  test('is one plural message in English', async () => {
    expect(bubble(await pin('', 'length="6" value="12"'))).toBe('Please enter all 6 characters.')
    expect(bubble(await pin('', 'length="2" value="1"'))).toBe('Please enter all 2 characters.')
  })

  test('picks the form the language has for the length', async () => {
    registerWords('pl', {
      'helix-pin-input': {
        tooShortMessage:
          '{length, plural, one {Wpisz # znak.} few {Wpisz wszystkie # znaki.} many {Wpisz wszystkie # znaków.} other {Wpisz wszystkie # znaku.}}',
      },
    })
    expect(bubble(await pin('lang="pl"', 'length="4" value="1"'))).toBe('Wpisz wszystkie 4 znaki.')
    expect(bubble(await pin('lang="pl"', 'length="6" value="1"'))).toBe('Wpisz wszystkie 6 znaków.')
  })
})
