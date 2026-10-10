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

/** Copy Button on the words registry: its name before and after a copy. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('a copy button on a page in another language', () => {
  test('is named in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-copy-button': { copiedLabel: 'Skopiowano', label: 'Kopiuj' } })
    document.body.innerHTML =
      '<div lang="pl"><helix-headless-copy-button value="x"></helix-headless-copy-button></div>'
    const host = document.querySelector('helix-headless-copy-button') as Updatable & {
      copiedLabel: string
    }
    await settle(host)
    expect(part(host, 'button')?.getAttribute('aria-label')).toBe('Kopiuj')
    expect(host.copiedLabel).toBe('Skopiowano')
  })

  test('keeps Copy in English', async () => {
    document.body.innerHTML = '<helix-headless-copy-button value="x"></helix-headless-copy-button>'
    const host = document.querySelector('helix-headless-copy-button') as Updatable
    await settle(host)
    expect(part(host, 'button')?.getAttribute('aria-label')).toBe('Copy')
  })
})
