import '@fusion.dev/helix-testing/dom/register'
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

/** Code Block on the words registry: its copy button's name is one sentence a page registers for its language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const copyName = async (around: string, attributes: string): Promise<string | null | undefined> => {
  document.body.innerHTML = `<div ${around}><helix-headless-code-block ${attributes}>x</helix-headless-code-block></div>`
  const host = document.querySelector('helix-headless-code-block') as Updatable
  await settle(host)
  return host.shadowRoot?.querySelector('helix-headless-copy-button')?.getAttribute('label')
}

describe('code block words', () => {
  test('a named block’s copy button is the sentence registered for the nearest lang', async () => {
    registerWords('de', {
      'helix-code-block': { copyLabel: 'Code kopieren', copyNameLabel: '{name} kopieren' },
    })
    expect(await copyName('lang="de"', 'label="app.ts"')).toBe('app.ts kopieren')
    expect(await copyName('lang="de"', '')).toBe('Code kopieren')
  })

  test('in English it says what it said', async () => {
    expect(await copyName('', 'label="app.ts"')).toBe('Copy code, app.ts')
  })
})
