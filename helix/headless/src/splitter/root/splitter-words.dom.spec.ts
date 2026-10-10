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

/**
 * Splitter on the words registry: the divider's name and its shut state come
 * from `registerWords` for the page's language, and its share is written as
 * that language writes a percentage.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const splitter = async (around: string, extra = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-splitter ${extra}>
    <div slot="start">Start</div>
    <div slot="end">End</div>
  </helix-headless-splitter></div>`
  const host = document.querySelector('helix-headless-splitter') as Updatable
  await settle(host)
  return host
}

const FRENCH = {
  'helix-splitter': { collapsedLabel: 'Replié', label: 'Redimensionner les volets' },
}

describe('a splitter on a page in another language', () => {
  test('names its divider in the registered words, and writes its share as the language does', async () => {
    registerWords('fr', FRENCH)
    const divider = part(await splitter('lang="fr"'), 'separator')
    expect(divider?.getAttribute('aria-label')).toBe('Redimensionner les volets')
    /* Before, the share was written in the browser's language: "50%". French
       puts a space before the sign, a narrow one in some runtimes. */
    const french = new Intl.NumberFormat('fr', { style: 'percent' }).format(0.5)
    expect(french).not.toBe('50%')
    expect(divider?.getAttribute('aria-valuetext')).toBe(french)
  })

  test('says a shut pane in the registered words', async () => {
    registerWords('fr', FRENCH)
    const divider = part(await splitter('lang="fr"', 'collapsed="start"'), 'separator')
    expect(divider?.getAttribute('aria-valuetext')).toBe('Replié')
  })

  test('keeps the English where nothing is registered', async () => {
    const divider = part(await splitter(''), 'separator')
    expect(divider?.getAttribute('aria-label')).toBe('Resize panes')
    expect(divider?.getAttribute('aria-valuetext')).toBe('50%')
  })
})
