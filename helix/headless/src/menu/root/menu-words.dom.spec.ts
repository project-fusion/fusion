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

/** Menu on the words registry: the row that returns from a submenu. */
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
  document.body.innerHTML = `<div ${around}><helix-headless-menu ${extra}><button slot="trigger">Datei</button></helix-headless-menu></div>`
  const host = document.querySelector<Host>('helix-headless-menu') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-menu': { backLabel: 'Zurück' } }

describe('on a page in another language', () => {
  test('reads the back row’s words from the registry, and a page’s own over it', async () => {
    registerWords('de', WORDS)
    expect((await mounted('lang="de"')).backLabel).toBe('Zurück')
    expect((await mounted('lang="de"', 'back-label="Hoch"')).backLabel).toBe('Hoch')
    expect((await mounted('')).backLabel).toBe('Back')
  })
})
