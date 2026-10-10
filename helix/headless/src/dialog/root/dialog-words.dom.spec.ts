import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Dialog on the words registry: the close control's name and the name a
 * dialog falls back to come from `registerWords` for the page's language.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const dialog = async (around = '', extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-dialog dismissible ${extra}>
    <p>Body</p>
  </helix-headless-dialog></div>`
  const host = document.querySelector('helix-headless-dialog') as Updatable
  await settle(host)
  return host
}

describe('a dialog on a page in another language', () => {
  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('de', {
      'helix-dialog': { dismissLabel: 'Schließen', fallbackLabel: 'Dialogfenster' },
    })
    const host = await dialog('lang="de"')
    expect(part(host, 'dismiss')?.getAttribute('aria-label')).toBe('Schließen')
    expect(part(host, 'surface')?.getAttribute('aria-label')).toBe('Dialogfenster')
  })

  test('keeps the English where nothing is registered, and a page’s own words over the registry', async () => {
    registerWords('de', { 'helix-dialog': { dismissLabel: 'Schließen' } })
    const english = await dialog()
    expect(part(english, 'dismiss')?.getAttribute('aria-label')).toBe('Close')
    expect(part(english, 'surface')?.getAttribute('aria-label')).toBe('Dialog')
    const own = await dialog('lang="de"', 'dismiss-label="Zu" label="Einstellungen"')
    expect(part(own, 'dismiss')?.getAttribute('aria-label')).toBe('Zu')
    expect(part(own, 'surface')?.getAttribute('aria-label')).toBe('Einstellungen')
  })

  test('changes language when words are registered after it renders', async () => {
    const host = await dialog('lang="de"')
    registerWords('de', { 'helix-dialog': { dismissLabel: 'Schließen' } })
    await settle(host)
    expect(part(host, 'dismiss')?.getAttribute('aria-label')).toBe('Schließen')
  })
})
