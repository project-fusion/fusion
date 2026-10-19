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
 * Filter Input on the words registry: the count of suggestions is one plural
 * message, picked by the rules of the nearest `lang`, and the menu's name is
 * registered under its own key.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../menu/index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const mount = async (around: string, count: number): Promise<Updatable> => {
  const options = Array.from(
    { length: count },
    (_, at) =>
      `<helix-headless-option slot="suggestions" value="v${at}">v${at}</helix-headless-option>`,
  ).join('')
  document.body.innerHTML = `<div ${around}><helix-headless-filter-input label="Filter rows">${options}</helix-headless-filter-input></div>`
  const host = document.querySelector('helix-headless-filter-input') as Updatable
  await settle(host)
  return host
}

/** Focus in the field, which opens the panel and says the count. */
const said = async (host: Updatable): Promise<string | null | undefined> => {
  const control = part(host as HTMLElement, 'control') as HTMLInputElement
  control.focus()
  control.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
  await settle(host)
  return part(host as HTMLElement, 'live')?.textContent
}

describe('the count of suggestions', () => {
  test('is one plural message, in English by default', async () => {
    expect(await said(await mount('', 3))).toBe('3 suggestions')
    expect(await said(await mount('', 1))).toBe('1 suggestion')
  })

  test('picks the form the nearest `lang` has, from the words registered for it', async () => {
    registerWords('pl', {
      'helix-filter-input': {
        suggestionsLabel:
          '{count, plural, one {# sugestia} few {# sugestie} many {# sugestii} other {# sugestii}}',
      },
    })
    expect(await said(await mount('lang="pl"', 3))).toBe('3 sugestie')
    expect(await said(await mount('lang="pl"', 5))).toBe('5 sugestii')
  })
})

describe('the filter menu', () => {
  test('is named in the words registered for its own key', async () => {
    registerWords('pl', { 'helix-filter-menu': { label: 'Filtruj' } })
    document.body.innerHTML =
      '<div lang="pl"><helix-headless-filter-menu></helix-headless-filter-menu></div>'
    const menu = document.querySelector('helix-headless-filter-menu') as Updatable & {
      label: string
    }
    await settle(menu)
    expect(menu.label).toBe('Filtruj')
  })
})
