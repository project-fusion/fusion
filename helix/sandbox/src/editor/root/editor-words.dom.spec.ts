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

/**
 * The editor on the words registry: the editable region's name is a word a
 * page registers for its language, and it follows a change to the words while
 * the editor is open.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('./editor-root.js')
})

afterEach(() => {
  clearWords()
  document.documentElement.removeAttribute('lang')
  document.body.innerHTML = ''
})

/** The name of the region a reader types into, which CodeMirror draws. */
const named = (host: Updatable): string | null | undefined =>
  host.shadowRoot?.querySelector('[contenteditable]')?.getAttribute('aria-label')

const editor = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-sandbox-editor value="<p>Hi</p>"></helix-sandbox-editor></div>`
  const host = document.querySelector('helix-sandbox-editor') as unknown as Updatable
  await settle(host)
  return host
}

describe('sandbox editor words', () => {
  test('names the region in English where nothing is registered', async () => {
    expect(named(await editor())).toBe('Example source')
  })

  test('names it in the words registered for the nearest lang, and follows a change', async () => {
    registerWords('de', { 'helix-sandbox-editor': { fieldLabel: 'Quelltext des Beispiels' } })
    const host = await editor('lang="de"')
    expect(named(host)).toBe('Quelltext des Beispiels')
    registerWords('de', { 'helix-sandbox-editor': { fieldLabel: 'Quelltext' } })
    await Promise.resolve()
    await settle(host)
    expect(named(host)).toBe('Quelltext')
  })
})
