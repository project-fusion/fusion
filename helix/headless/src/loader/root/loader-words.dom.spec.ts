import '@fusion.dev/helix-testing/dom/register'
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

/** Loader on the words registry: its name is the word registered for the page's language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const loader = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-loader></helix-headless-loader></div>`
  const host = document.querySelector('helix-headless-loader') as Updatable
  await settle(host)
  return host
}

describe('loader words', () => {
  test('is named by the word registered for the nearest lang, and in English as before', async () => {
    registerWords('de', { 'helix-loader': { label: 'Wird geladen' } })
    expect(label(await loader('lang="de"'))).toBe('Wird geladen')
    expect(label(await loader())).toBe('Loading')
  })
})
