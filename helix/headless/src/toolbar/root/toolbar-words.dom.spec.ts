import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Toolbar on the words registry: its name. */
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
