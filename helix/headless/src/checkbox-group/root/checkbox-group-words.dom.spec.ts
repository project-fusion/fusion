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

/** Checkbox Group on the words registry. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('a checkbox group on a page in another language', () => {
  test('writes its select-all words in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-checkbox-group': { selectAllLabel: 'Zaznacz wszystko' } })
    document.body.innerHTML = `<div lang="pl"><helix-headless-checkbox-group label="L" select-all>
      <helix-headless-checkbox value="a" label="A"></helix-headless-checkbox>
    </helix-headless-checkbox-group></div>`
    const host = document.querySelector('helix-headless-checkbox-group') as Updatable
    await settle(host)
    expect(part(host, 'select-all')?.getAttribute('label')).toBe('Zaznacz wszystko')
  })
})
