import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { label, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/** Toast on the words registry: the region's name, with its `{hotkey}`. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const toast = async (around: string, extra = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-toast ${extra}></helix-headless-toast></div>`
  const host = document.querySelector('helix-headless-toast') as Updatable
  await settle(host)
  return host
}

describe('a toast region on a page in another language', () => {
  test('is named in the registered words, with its key put in', async () => {
    registerWords('de', { 'helix-toast': { label: 'Benachrichtigungen ({hotkey})' } })
    expect(label(await toast('lang="de"', 'hotkey="Alt+T"'))).toBe('Benachrichtigungen (Alt+T)')
  })

  test('keeps the English where nothing is registered for the language', async () => {
    registerWords('de', { 'helix-toast': { label: 'Benachrichtigungen ({hotkey})' } })
    expect(label(await toast('lang="fr"'))).toBe('Notifications (F8)')
  })
})
