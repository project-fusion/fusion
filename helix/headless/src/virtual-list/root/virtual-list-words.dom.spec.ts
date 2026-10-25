import '@fusion.dev/helix-testing/dom/register'
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

/** Virtual List on the words registry: the row it draws while loading. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const list = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-virtual-list label="Rows" loading></helix-headless-virtual-list></div>`
  const host = document.querySelector('helix-headless-virtual-list') as Updatable
  await settle(host)
  return host
}

describe('a virtual list on a page in another language', () => {
  test('says it is loading in the words registered for the nearest `lang`', async () => {
    registerWords('fr', { 'helix-virtual-list': { loadingText: 'Chargement de la suite' } })
    const host = await list('lang="fr"')
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Chargement de la suite')
  })

  test('says it in English where nothing is registered', async () => {
    const host = await list('lang="fr"')
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Loading more')
  })
})
