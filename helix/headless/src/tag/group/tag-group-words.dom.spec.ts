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

/**
 * Tag Group on the words registry, and a tag's remove button named by one
 * sentence that holds the tag's words.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('tag words', () => {
  test('an emptied group shows the words registered for the nearest lang', async () => {
    registerWords('de', { 'helix-tag-group': { emptyLabel: 'Keine Schlagwörter' } })
    document.body.innerHTML =
      '<div lang="de"><helix-headless-tag-group label="Filter"></helix-headless-tag-group></div>'
    const host = document.querySelector('helix-headless-tag-group') as Updatable
    await settle(host)
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Keine Schlagwörter')
  })

  test('the remove button is named by one sentence, the tag’s words where it says', async () => {
    document.body.innerHTML = '<helix-headless-tag dismissible>Apple</helix-headless-tag>'
    const tag = document.querySelector('helix-headless-tag') as Updatable
    await settle(tag)
    expect(part(tag, 'dismiss')?.getAttribute('aria-label')).toBe('Remove Apple')
    document.body.innerHTML =
      '<helix-headless-tag dismissible dismiss-label="„{label}“ entfernen">Apple</helix-headless-tag>'
    const german = document.querySelector('helix-headless-tag') as Updatable
    await settle(german)
    expect(part(german, 'dismiss')?.getAttribute('aria-label')).toBe('„Apple“ entfernen')
  })
})
