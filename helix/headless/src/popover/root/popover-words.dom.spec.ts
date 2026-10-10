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
 * Popover on the words registry: the name a panel falls back to comes from
 * `registerWords` for the page's language, and a registered word never stops
 * the panel's heading from naming it.
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

const popover = async (inside = '', extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div lang="de"><helix-headless-popover ${extra}>
    <button slot="trigger">Filter</button>
    ${inside}
  </helix-headless-popover></div>`
  const host = document.querySelector('helix-headless-popover') as Updatable & {
    requestUpdate(): void
  }
  await settle(host)
  const panel = part(host, 'surface') as HTMLElement & Record<string, unknown>
  /* happy-dom has no element reflection, so the accessor is stood in. */
  Object.defineProperty(panel, 'ariaLabelledByElements', { value: null, writable: true })
  host.requestUpdate()
  await settle(host)
  return host
}

describe('a popover on a page in another language', () => {
  test('falls back to the name registered for the nearest `lang`', async () => {
    registerWords('de', { 'helix-popover': { fallbackLabel: 'Aufklappfenster' } })
    const host = await popover('<p>Body</p>')
    expect(part(host, 'surface')?.getAttribute('aria-label')).toBe('Aufklappfenster')
  })

  test('is still named by its heading where a fallback is registered', async () => {
    registerWords('de', { 'helix-popover': { fallbackLabel: 'Aufklappfenster' } })
    const host = await popover('<div><h3>Filter</h3></div>')
    const panel = part(host, 'surface') as HTMLElement & { ariaLabelledByElements?: Element[] }
    expect(panel.ariaLabelledByElements?.map((one) => one.textContent)).toEqual(['Filter'])
  })

  test('takes a page’s own `label` over both', async () => {
    registerWords('de', { 'helix-popover': { fallbackLabel: 'Aufklappfenster' } })
    const host = await popover('<div><h3>Filter</h3></div>', 'label="Einstellungen"')
    const panel = part(host, 'surface') as HTMLElement & { ariaLabelledByElements?: Element[] }
    expect(panel.getAttribute('aria-label')).toBe('Einstellungen')
    expect(panel.ariaLabelledByElements ?? []).toEqual([])
  })

  test('says Popover in English where nothing names it', async () => {
    const host = await popover('<p>Body</p>')
    expect(part(host, 'surface')?.getAttribute('aria-label')).toBe('Popover')
  })
})
