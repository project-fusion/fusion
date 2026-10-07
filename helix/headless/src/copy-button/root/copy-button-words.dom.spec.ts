import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Copy Button on the words registry: its name before and after a copy. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('a copy button on a page in another language', () => {
  test('is named in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-copy-button': { copiedLabel: 'Skopiowano', label: 'Kopiuj' } })
    document.body.innerHTML =
      '<div lang="pl"><helix-headless-copy-button value="x"></helix-headless-copy-button></div>'
    const host = document.querySelector('helix-headless-copy-button') as Updatable & {
      copiedLabel: string
    }
    await settle(host)
    expect(part(host, 'button')?.getAttribute('aria-label')).toBe('Kopiuj')
    expect(host.copiedLabel).toBe('Skopiowano')
  })

  test('keeps Copy in English', async () => {
    document.body.innerHTML = '<helix-headless-copy-button value="x"></helix-headless-copy-button>'
    const host = document.querySelector('helix-headless-copy-button') as Updatable
    await settle(host)
    expect(part(host, 'button')?.getAttribute('aria-label')).toBe('Copy')
  })
})
