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

/**
 * Tour on the words registry: the run's place in the tour is registered under
 * `helix-tour`, and a stop's controls under `helix-tour-stop`.
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

const tour = async (around: string, extra = ''): Promise<Updatable[]> => {
  document.body.innerHTML = `<div ${around}>
    <button id="one">One</button><button id="two">Two</button>
    <helix-headless-tour label="Getting started" open ${extra}>
      <helix-headless-tour-stop for="one">First</helix-headless-tour-stop>
      <helix-headless-tour-stop for="two">Second</helix-headless-tour-stop>
    </helix-headless-tour>
  </div>`
  const host = document.querySelector('helix-headless-tour') as Updatable
  await settle(host)
  const stops = [...host.querySelectorAll('helix-headless-tour-stop')] as Updatable[]
  for (const stop of stops) {
    await settle(stop)
  }
  return stops
}

const GERMAN = {
  'helix-tour': { progressLabel: 'Schritt {index} von {count}' },
  'helix-tour-stop': { doneLabel: 'Fertig', nextLabel: 'Weiter', skipLabel: 'Überspringen' },
}

describe('a tour on a page in another language', () => {
  test('says each stop’s place and draws its controls in the registered words', async () => {
    registerWords('de', GERMAN)
    const [first, last] = await tour('lang="de"')
    expect(part(first as HTMLElement, 'progress')?.textContent).toBe('Schritt 1 von 2')
    expect(part(first as HTMLElement, 'next')?.textContent?.trim()).toBe('Weiter')
    expect(part(first as HTMLElement, 'skip')?.textContent?.trim()).toBe('Überspringen')
    expect(part(last as HTMLElement, 'next')?.textContent?.trim()).toBe('Fertig')
  })

  test('keeps a tour’s own words over the registry, and the English where nothing is registered', async () => {
    registerWords('de', GERMAN)
    const [german] = await tour('lang="de"', 'next-label="Los"')
    expect(part(german as HTMLElement, 'next')?.textContent?.trim()).toBe('Los')
    const [english] = await tour('')
    expect(part(english as HTMLElement, 'progress')?.textContent).toBe('1 of 2')
    expect(part(english as HTMLElement, 'next')?.textContent?.trim()).toBe('Next')
  })
})
