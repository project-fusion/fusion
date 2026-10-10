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
 * Video on the words registry: its controls speak the words registered for
 * the page's language, and the seconds a skip covers take plural forms.
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

const video = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-video label="A clip" extra-controls="rewind forward" src="blob:clip"></helix-headless-video></div>`
  const host = document.querySelector('helix-headless-video') as Updatable
  await settle(host)
  return host
}

const POLISH = {
  'helix-video': {
    playLabel: 'Odtwórz',
    rewindLabel:
      '{seconds, plural, one {Do tyłu # sekundę} few {Do tyłu # sekundy} many {Do tyłu # sekund} other {Do tyłu # sekundy}}',
  },
}

describe('a video on a page in another language', () => {
  test('names its controls with the words registered for the nearest `lang`', async () => {
    registerWords('pl', POLISH)
    const host = await video('lang="pl"')
    expect(part(host, 'play')?.getAttribute('aria-label')).toBe('Odtwórz')
    expect(part(host, 'rewind')?.getAttribute('aria-label')).toBe('Do tyłu 10 sekund')
  })

  test('names them in English where nothing is registered', async () => {
    const host = await video('lang="pl"')
    expect(part(host, 'rewind')?.getAttribute('aria-label')).toBe('Back 10 seconds')
    expect(part(host, 'forward')?.getAttribute('aria-label')).toBe('Forward 10 seconds')
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await video('lang="pl"')
    registerWords('pl', POLISH)
    await Promise.resolve()
    await settle(host)
    expect(part(host, 'play')?.getAttribute('aria-label')).toBe('Odtwórz')
  })
})
