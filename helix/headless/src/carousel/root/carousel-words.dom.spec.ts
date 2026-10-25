import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import {
  internalsOf,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Carousel on the words registry: its words come from the page's language,
 * and the numbers in its sentences are written in it.
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

type Carousel = Updatable & { internals?: ElementInternals }

const carousel = async (around = '', extra = ''): Promise<Carousel> => {
  document.body.innerHTML = `<div ${around}><helix-headless-carousel ${extra}>
    <div>Design</div>
    <div>Mind</div>
    <div>Energy</div>
  </helix-headless-carousel></div>`
  const host = document.querySelector('helix-headless-carousel') as unknown as Carousel
  await settle(host)
  return host
}

const slides = (host: HTMLElement): (string | null)[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="slide"]') ?? [])].map((one) =>
    one.getAttribute('aria-label'),
  )

const GERMAN = {
  'helix-carousel': {
    label: 'Karussell',
    nextLabel: 'Nächste Folie',
    roleLabel: 'Karussell',
    slideLabel: '{index} von {count}',
  },
}

describe('a carousel on a page in another language', () => {
  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('de', GERMAN)
    const host = await carousel('lang="de"')
    expect(slides(host)).toEqual(['1 von 3', '2 von 3', '3 von 3'])
    expect(part(host, 'next')?.getAttribute('aria-label')).toBe('Nächste Folie')
    expect(internalsOf(host)?.ariaRoleDescription).toBe('Karussell')
  })

  test('writes the numbers in its sentences in the page’s language', async () => {
    const host = await carousel('lang="ar-EG"')
    expect(slides(host)).toEqual(['١ of ٣', '٢ of ٣', '٣ of ٣'])
  })

  test('keeps a `label` the page wrote', async () => {
    registerWords('de', GERMAN)
    const host = await carousel('lang="de"', 'label="Themen"')
    expect(internalsOf(host)?.ariaLabel).toBe('Themen')
  })
})
