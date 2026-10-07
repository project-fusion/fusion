import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Tabs on the words registry: the name of the list of tabs. */
beforeAll(async () => {
  registerDom()
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
  test('names its list of tabs in the registered words', async () => {
    registerWords('de', WORDS)
    expect(part(await mounted('lang="de"'), 'tabs')?.getAttribute('aria-label')).toBe('Reiter')
    expect(part(await mounted(''), 'tabs')?.getAttribute('aria-label')).toBe('Tabs')
  })
})
