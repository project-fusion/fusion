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

/** Navigation on the words registry: the landmark's name. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Host = Updatable & Record<string, unknown>

const mounted = async (around: string, extra = ''): Promise<Host> => {
  document.body.innerHTML = `<div ${around}><helix-headless-navigation ${extra}><a href="#a">A</a></helix-headless-navigation></div>`
  const host = document.querySelector<Host>('helix-headless-navigation') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-navigation': { label: 'Hauptmenü' } }

describe('on a page in another language', () => {
  test('names its landmark in the registered words, and a page’s own over them', async () => {
    registerWords('de', WORDS)
    expect(part(await mounted('lang="de"'), 'nav')?.getAttribute('aria-label')).toBe('Hauptmenü')
    expect(
      part(await mounted('lang="de"', 'label="Konto"'), 'nav')?.getAttribute('aria-label'),
    ).toBe('Konto')
    expect(part(await mounted(''), 'nav')?.getAttribute('aria-label')).toBe('Main')
  })
})
