import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Textarea on the words registry. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

describe('a textarea on a page in another language', () => {
  test('names its clear button in the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-textarea': { clearLabel: 'Wyczyść' } })
    document.body.innerHTML =
      '<div lang="pl"><helix-headless-textarea label="L" value="x" clearable></helix-headless-textarea></div>'
    const host = document.querySelector('helix-headless-textarea') as Updatable
    await settle(host)
    expect(part(host, 'clear')?.getAttribute('aria-label')).toBe('Wyczyść')
  })
})
