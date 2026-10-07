import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Virtual List on the words registry: the row it draws while loading. */
beforeAll(async () => {
  registerDom()
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
    registerWords('fr', { 'helix-virtual-list': { loadingLabel: 'Chargement de la suite' } })
    const host = await list('lang="fr"')
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Chargement de la suite')
  })

  test('says it in English where nothing is registered', async () => {
    const host = await list('lang="fr"')
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Loading more')
  })
})
