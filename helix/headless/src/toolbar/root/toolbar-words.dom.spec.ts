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

/** Toolbar on the words registry: its name. */
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
  document.body.innerHTML = `<div ${around}><helix-headless-toolbar ${extra}><button>Bold</button></helix-headless-toolbar></div>`
  const host = document.querySelector<Host>('helix-headless-toolbar') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-toolbar': { label: 'Werkzeugleiste' } }

describe('on a page in another language', () => {
  test('names itself in the registered words', async () => {
    registerWords('de', WORDS)
    expect(part(await mounted('lang="de"'), 'toolbar')?.getAttribute('aria-label')).toBe(
      'Werkzeugleiste',
    )
    expect(part(await mounted(''), 'toolbar')?.getAttribute('aria-label')).toBe('Toolbar')
  })
})
