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
 * Lightbox on the words registry: its controls, its place in the set and its
 * zoom are said in the words registered for the page's language, with every
 * number written in that language.
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

type Lightbox = Updatable & { next(): void; zoomTo(scale: number): void }

const lightbox = async (around: string, extra = ''): Promise<Lightbox> => {
  document.body.innerHTML = `<div ${around}><helix-headless-lightbox controls ${extra}>
    <helix-headless-lightbox-item value="one"></helix-headless-lightbox-item>
    <helix-headless-lightbox-item value="two"></helix-headless-lightbox-item>
  </helix-headless-lightbox></div>`
  const host = document.querySelector('helix-headless-lightbox') as Lightbox
  await settle(host)
  for (const item of host.querySelectorAll('helix-headless-lightbox-item')) {
    await settle(item as Updatable)
  }
  return host
}

const GERMAN = {
  'helix-lightbox': {
    fallbackLabel: 'Bildbetrachter',
    nextLabel: 'Weiter',
    slideLabel: 'Bild {index} von {count}',
    slideRoleLabel: 'Folie',
    statusLabel: '{index} von {count}',
    zoomStatusLabel: 'Auf {scale, number, percent} vergrößert',
  },
}

describe('a lightbox on a page in another language', () => {
  test('names its viewer, its controls and its items in the registered words', async () => {
    registerWords('de', GERMAN)
    const host = await lightbox('lang="de"')
    expect(part(host, 'dialog')?.getAttribute('aria-label')).toBe('Bildbetrachter')
    expect(part(host, 'next')?.getAttribute('aria-label')).toBe('Weiter')
    const item = host.querySelector('helix-headless-lightbox-item') as HTMLElement
    const group = item.shadowRoot?.querySelector('[aria-roledescription]')
    expect(group?.getAttribute('aria-label')).toBe('Bild 1 von 2')
    expect(group?.getAttribute('aria-roledescription')).toBe('Folie')
  })

  test('says its place and its zoom in the registered words, the percentage as the language writes it', async () => {
    registerWords('de', GERMAN)
    const host = await lightbox('lang="de"', 'open max-zoom="3"')
    const live = (): string => part(host, 'live')?.textContent?.trim() ?? ''
    host.next()
    await settle(host)
    expect(live()).toBe('2 von 2')
    host.zoomTo(1.5)
    await new Promise((done) => setTimeout(done, 450))
    await settle(host)
    /* German puts a space before the sign. */
    const scale = new Intl.NumberFormat('de', { style: 'percent' }).format(1.5)
    expect(scale).not.toBe('150%')
    expect(live()).toBe(`Auf ${scale} vergrößert`)
  })

  test('writes the English percentage where nothing is registered', async () => {
    const host = await lightbox('', 'open max-zoom="3"')
    host.zoomTo(1.5)
    await new Promise((done) => setTimeout(done, 450))
    await settle(host)
    expect(part(host, 'live')?.textContent?.trim()).toBe('Zoomed to 150%')
  })
})
