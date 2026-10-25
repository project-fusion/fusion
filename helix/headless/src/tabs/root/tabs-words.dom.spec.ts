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

/** Tabs on the words registry: the name of the list of tabs. */
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
  document.body.innerHTML = `<div ${around}><helix-headless-tabs ${extra}><helix-headless-tab value="a">A</helix-headless-tab><helix-headless-tab-panel value="a">A</helix-headless-tab-panel></helix-headless-tabs></div>`
  const host = document.querySelector<Host>('helix-headless-tabs') as Host
  await settle(host)
  return host
}

const WORDS = { 'helix-tabs': { label: 'Reiter' } }

describe('on a page in another language', () => {
  /* "Tabs" was its built-in name. `label` is the page's now, and no word
     registered for it reaches it. */
  test('names its list of tabs only by the page, whatever is registered', async () => {
    registerWords('de', WORDS)
    expect(part(await mounted('lang="de"'), 'tabs')?.hasAttribute('aria-label')).toBe(false)
    expect(
      part(await mounted('lang="de"', 'label="Ansichten"'), 'tabs')?.getAttribute('aria-label'),
    ).toBe('Ansichten')
  })
})
