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

/** Skip Link on the words registry: the words the link shows where nothing is slotted. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Host = Updatable & Record<string, unknown>

const mounted = async (around: string, extra = ''): Promise<Host> => {
  document.body.innerHTML = `<div ${around}><helix-headless-skip-link ${extra}></helix-headless-skip-link></div>`
  const host = document.querySelector<Host>('helix-headless-skip-link') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-skip-link': { fallbackLabel: 'Zum Inhalt springen' } }

describe('on a page in another language', () => {
  test('shows the registered words where nothing is slotted', async () => {
    registerWords('de', WORDS)
    expect(part(await mounted('lang="de"'), 'link')?.textContent?.trim()).toBe(
      'Zum Inhalt springen',
    )
    expect(part(await mounted(''), 'link')?.textContent?.trim()).toBe('Skip to content')
  })
})
