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

/** Outline on the words registry: the navigation's name. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const outline = async (around = '', extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-outline ${extra}></helix-headless-outline></div>`
  const host = document.querySelector('helix-headless-outline') as Updatable
  await settle(host)
  return host
}

describe('an outline on a page in another language', () => {
  test('is named with the words registered for the nearest `lang`', async () => {
    registerWords('de', { 'helix-outline': { fallbackLabel: 'Auf dieser Seite' } })
    const host = await outline('lang="de"')
    expect(part(host, 'nav')?.getAttribute('aria-label')).toBe('Auf dieser Seite')
  })

  test('keeps a `label` the page wrote', async () => {
    registerWords('de', { 'helix-outline': { fallbackLabel: 'Auf dieser Seite' } })
    const host = await outline('lang="de"', 'label="Inhalt"')
    expect(part(host, 'nav')?.getAttribute('aria-label')).toBe('Inhalt')
  })

  test('is named in English where nothing is registered', async () => {
    const host = await outline('lang="de"')
    expect(part(host, 'nav')?.getAttribute('aria-label')).toBe('On this page')
  })
})
