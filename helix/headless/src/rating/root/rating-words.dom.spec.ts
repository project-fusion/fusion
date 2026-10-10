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

/** Rating on the words registry: each mark's name, with its numbers written in the locale. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const names = async (around: string): Promise<string[]> => {
  document.body.innerHTML = `<div ${around}><helix-headless-rating label="L" step="0.5" max="2"></helix-headless-rating></div>`
  const host = document.querySelector('helix-headless-rating') as Updatable
  await settle(host)
  return [...(host.shadowRoot?.querySelectorAll('[part~="option"]') ?? [])].map(
    (option) => option.getAttribute('aria-label') ?? '',
  )
}

describe('the names of a rating’s marks', () => {
  test('are English by default', async () => {
    expect(await names('')).toEqual(['0.5 out of 2', '1 out of 2', '1.5 out of 2', '2 out of 2'])
  })

  test('are the words registered for the nearest `lang`, with its digits', async () => {
    registerWords('de', { 'helix-rating': { optionLabel: '{score} von {max}' } })
    expect(await names('lang="de"')).toEqual(['0,5 von 2', '1 von 2', '1,5 von 2', '2 von 2'])
  })
})
