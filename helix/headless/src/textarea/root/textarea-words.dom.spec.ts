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

/** Textarea on the words registry. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('a textarea on a page in another language', () => {
  test('names its clear button in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-textarea': { clearLabel: 'Wyczyść' } })
    document.body.innerHTML =
      '<div lang="pl"><helix-headless-textarea label="L" value="x" clearable></helix-headless-textarea></div>'
    const host = document.querySelector('helix-headless-textarea') as Updatable
    await settle(host)
    expect(part(host, 'clear')?.getAttribute('aria-label')).toBe('Wyczyść')
  })
})
