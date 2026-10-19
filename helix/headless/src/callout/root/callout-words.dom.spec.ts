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

/** Callout on the words registry: each tone's name is a word a page registers for its language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const callout = async (around: string, attributes: string): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-callout ${attributes}>Text</helix-headless-callout></div>`
  const host = document.querySelector('helix-headless-callout') as Updatable
  await settle(host)
  return host
}

const toneName = (host: Updatable): string | null | undefined =>
  part(host, 'icon')?.getAttribute('aria-label')

describe('callout words', () => {
  test('each tone is named by the word registered for the nearest lang, and English for the rest', async () => {
    registerWords('de', {
      'helix-callout': { toneLabels: { danger: 'Fehler', neutral: 'Hinweis' } },
    })
    expect(toneName(await callout('lang="de"', 'tone="danger"'))).toBe('Fehler')
    expect(toneName(await callout('lang="de"', 'tone="neutral"'))).toBe('Hinweis')
    expect(toneName(await callout('lang="de"', 'tone="warning"'))).toBe('Warning')
  })

  test('tone-label still wins, and a page’s table wins over the registry', async () => {
    registerWords('de', { 'helix-callout': { toneLabels: { danger: 'Fehler' } } })
    expect(toneName(await callout('lang="de"', 'tone="danger" tone-label="Achtung"'))).toBe(
      'Achtung',
    )
    expect(
      toneName(await callout('lang="de"', `tone="danger" tone-labels='{"danger":"Problem"}'`)),
    ).toBe('Problem')
  })

  test('an unknown tone is named as information, as before', async () => {
    expect(toneName(await callout('', 'tone="brand"'))).toBe('Information')
  })
})
