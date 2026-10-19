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

/** Orb on the words registry: each state's word is registered for the page's language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const orb = async (around: string, attributes: string): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-orb ${attributes}></helix-orb></div>`
  const host = document.querySelector('helix-orb') as Updatable
  await settle(host)
  return host
}

describe('orb words', () => {
  test('a state is named by the word registered for the nearest lang, English for the rest', async () => {
    registerWords('fr', { 'helix-orb': { stateLabels: { thinking: 'Réflexion' } } })
    expect(label(await orb('lang="fr"', 'state="thinking"'))).toBe('Réflexion')
    expect(label(await orb('lang="fr"', 'state="done"'))).toBe('Done')
  })

  test('a page’s own word wins over the registry', async () => {
    registerWords('fr', { 'helix-orb': { stateLabels: { done: 'Fini' } } })
    expect(label(await orb('lang="fr"', `state="done" state-labels='{"done":"Terminé"}'`))).toBe(
      'Terminé',
    )
  })
})
