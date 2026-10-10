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
 * Drawer on the words registry: the close control's name and the name a
 * drawer falls back to come from `registerWords` for the page's language.
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

const drawer = async (around = '', extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-drawer dismissible ${extra}>
    <p>Body</p>
  </helix-headless-drawer></div>`
  const host = document.querySelector('helix-headless-drawer') as Updatable
  await settle(host)
  return host
}

describe('a drawer on a page in another language', () => {
  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('de', {
      'helix-drawer': { dismissLabel: 'Schließen', fallbackLabel: 'Seitenleiste' },
    })
    const host = await drawer('lang="de"')
    expect(part(host, 'dismiss')?.getAttribute('aria-label')).toBe('Schließen')
    expect(part(host, 'panel')?.getAttribute('aria-label')).toBe('Seitenleiste')
  })

  test('keeps the English where nothing is registered, and a page’s own words over the registry', async () => {
    registerWords('de', { 'helix-drawer': { dismissLabel: 'Schließen' } })
    const english = await drawer()
    expect(part(english, 'dismiss')?.getAttribute('aria-label')).toBe('Close')
    expect(part(english, 'panel')?.getAttribute('aria-label')).toBe('Drawer')
    const own = await drawer('lang="de"', 'dismiss-label="Zu" label="Einstellungen"')
    expect(part(own, 'dismiss')?.getAttribute('aria-label')).toBe('Zu')
    expect(part(own, 'panel')?.getAttribute('aria-label')).toBe('Einstellungen')
  })

  test('changes language when words are registered after it renders', async () => {
    const host = await drawer('lang="de"')
    registerWords('de', { 'helix-drawer': { dismissLabel: 'Schließen' } })
    await settle(host)
    expect(part(host, 'dismiss')?.getAttribute('aria-label')).toBe('Schließen')
  })
})
