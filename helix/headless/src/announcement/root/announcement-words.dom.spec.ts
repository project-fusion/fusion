import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { label, registerDom, role, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/** Announcement on the words registry: its region's name is the word registered for the page's language. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const announcement = async (around = '', attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-announcement ${attributes}>Wartung heute Nacht</helix-headless-announcement></div>`
  const host = document.querySelector('helix-headless-announcement') as Updatable
  await settle(host)
  return host
}

describe('announcement words', () => {
  test('the region is named by the word registered for the nearest lang', async () => {
    registerWords('de', { 'helix-announcement': { label: 'Mitteilung' } })
    expect(label(await announcement('lang="de"'))).toBe('Mitteilung')
    expect(label(await announcement())).toBe('Announcement')
  })

  test('an empty label still leaves no region, whatever is registered', async () => {
    registerWords('de', { 'helix-announcement': { label: 'Mitteilung' } })
    const host = await announcement('lang="de"', 'label=""')
    expect([label(host), role(host)]).toEqual([null, null])
  })
})
