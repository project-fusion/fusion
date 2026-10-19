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

/** Drilldown on the words registry: the top page's name and the back button. */
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
  document.body.innerHTML = `<div ${around}><helix-headless-drilldown ${extra}><helix-headless-drilldown-item>Files</helix-headless-drilldown-item></helix-headless-drilldown></div>`
  const host = document.querySelector<Host>('helix-headless-drilldown') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-drilldown': { backLabel: 'Zurück', label: 'Menüführung' } }

describe('on a page in another language', () => {
  test('names its top page and its way back in the registered words', async () => {
    registerWords('de', WORDS)
    const host = await mounted('lang="de"')
    expect(part(host, 'page')?.getAttribute('aria-label')).toBe('Menüführung')
    expect(host.backLabel).toBe('Zurück')
    const english = await mounted('')
    expect(part(english, 'page')?.getAttribute('aria-label')).toBe('Navigation')
  })
})
