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

/** Input on the words registry: its button names come from `registerWords` for the page's language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const input = async (around: string, extra = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-input label="L" value="x" clearable reveal type="password" ${extra}></helix-headless-input></div>`
  const host = document.querySelector('helix-headless-input') as Updatable
  await settle(host)
  return host
}

const named = (host: HTMLElement, name: string): string | null | undefined =>
  part(host, name)?.getAttribute('aria-label')

describe('an input on a page in another language', () => {
  test('names its buttons in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-input': { clearLabel: 'Wyczyść', revealLabel: 'Pokaż hasło' } })
    const host = await input('lang="pl"')
    expect(named(host, 'clear')).toBe('Wyczyść')
    expect(named(host, 'reveal')).toBe('Pokaż hasło')
  })

  test('keeps the English where nothing is registered, and words a page set over the registry', async () => {
    registerWords('pl', { 'helix-input': { clearLabel: 'Wyczyść' } })
    expect(named(await input(''), 'clear')).toBe('Clear')
    expect(named(await input('lang="pl"', 'clear-label="Usuń"'), 'clear')).toBe('Usuń')
  })
})
