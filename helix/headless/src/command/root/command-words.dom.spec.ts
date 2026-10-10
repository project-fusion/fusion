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

/** Command on the words registry: its count is one plural message, in the nearest `lang`. */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Filtered = HTMLElement & { requestFilter: (next: string) => boolean }

const palette = async (around: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-command default-open>
    <helix-headless-option value="new">New file</helix-headless-option>
    <helix-headless-option value="open">Open file</helix-headless-option>
    <helix-headless-option value="color">Change color theme</helix-headless-option>
  </helix-headless-command></div>`
  const host = document.querySelector('helix-headless-command') as Updatable
  await settle(host)
  return host
}

const listbox = (host: HTMLElement): Filtered => part(host, 'listbox') as Filtered

const said = async (host: HTMLElement, filter: string): Promise<string> => {
  listbox(host).requestFilter(filter)
  await settle(host)
  await settle(listbox(host) as unknown as Updatable)
  return listbox(host).shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''
}

describe('the count a command palette says', () => {
  test('is one plural message, in English by default', async () => {
    const host = await palette('')
    expect(listbox(host).getAttribute('result-label')).toBe('')
    expect(await said(host, 'file')).toBe('2 commands')
    expect(await said(host, 'new')).toBe('1 command')
  })

  test('is in the words registered for the nearest `lang`, with its forms', async () => {
    registerWords('pl', {
      'helix-command': {
        placeholder: 'Szukaj poleceń',
        resultsLabel:
          '{count, plural, one {# polecenie} few {# polecenia} many {# poleceń} other {# polecenia}}',
      },
    })
    const host = await palette('lang="pl"')
    expect(listbox(host).getAttribute('filter-label')).toBe('Szukaj poleceń')
    expect(await said(host, 'file')).toBe('2 polecenia')
    expect(await said(host, 'new')).toBe('1 polecenie')
  })
})
