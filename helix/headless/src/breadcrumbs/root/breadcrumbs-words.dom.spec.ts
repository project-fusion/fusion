import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { label, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Breadcrumbs on the words registry: the landmark's name, and the fold's
 * button, whose count picks the language's plural form and is written in it.
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

type Trail = Updatable & { items: { href: string; label: string }[] }

const trail = async (around: string, crumbs: number): Promise<Trail> => {
  document.body.innerHTML = `<div ${around}><helix-headless-breadcrumbs max-items="3"></helix-headless-breadcrumbs></div>`
  const host = document.querySelector('helix-headless-breadcrumbs') as Trail
  host.items = Array.from({ length: crumbs }, (_, at) => ({ href: `#${at}`, label: `P${at}` }))
  await settle(host)
  return host
}

/** The fold's button, which the trail's first crumb draws. */
const fold = async (host: Trail): Promise<Element | null | undefined> => {
  const first = host.shadowRoot?.querySelector('helix-headless-breadcrumb') as Updatable | null
  if (first) {
    await settle(first)
  }
  return first ? part(first, 'expand') : null
}

const POLISH = {
  'helix-breadcrumbs': {
    expandLabel:
      '{count, plural, one {Pokaż # więcej} few {Pokaż # kolejne} many {Pokaż # kolejnych} other {Pokaż # kolejnego}}',
    fallbackLabel: 'Ścieżka',
  },
}

describe('breadcrumbs on a page in another language', () => {
  test('name the landmark in the registered words', async () => {
    registerWords('pl', POLISH)
    expect(label(await trail('lang="pl"', 4))).toBe('Ścieżka')
    expect(label(await trail('', 4))).toBe('Breadcrumb')
  })

  test('count the folded crumbs with the language’s own forms', async () => {
    registerWords('pl', POLISH)
    const expand = async (crumbs: number): Promise<string | null | undefined> =>
      (await fold(await trail('lang="pl"', crumbs)))?.getAttribute('label')
    expect(await expand(5)).toBe('Pokaż 2 kolejne')
    expect(await expand(8)).toBe('Pokaż 5 kolejnych')
  })

  test('write the count in the page’s language', async () => {
    /* Before, the count went in as raw digits whatever the language. */
    registerWords('ar', { 'helix-breadcrumbs': { expandLabel: 'Show {count} more' } })
    const host = await trail('lang="ar-EG"', 6)
    expect((await fold(host))?.getAttribute('label')).toBe('Show ٣ more')
  })
})
