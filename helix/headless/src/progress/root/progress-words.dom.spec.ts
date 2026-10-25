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
 * Progress on the words registry: its name and what it says on finishing come
 * from `registerWords` for the page's language, and the reading is written in
 * the locale the nearest `lang` names.
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

type Bar = Updatable & { value: number }

const progress = async (around = ''): Promise<Bar> => {
  document.body.innerHTML = `<div ${around}><helix-headless-progress value="50" max="200" show-value></helix-headless-progress></div>`
  const host = document.querySelector('helix-headless-progress') as Bar
  await settle(host)
  return host
}

describe('progress words', () => {
  test('the name and the finishing words are the ones registered for the nearest lang', async () => {
    registerWords('de', {
      'helix-progress': { completeLabel: 'Fertig', fallbackLabel: 'Fortschritt' },
    })
    const host = await progress('lang="de"')
    expect(label(host)).toBe('Fortschritt')
    host.value = 200
    await settle(host)
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    await settle(host)
    expect(part(host, 'live')?.textContent).toBe('Fertig')
  })

  test('the reading is written in the locale the nearest lang names', async () => {
    const host = await progress('lang="fr"')
    expect(host.shadowRoot?.textContent).toContain(
      new Intl.NumberFormat('fr', { maximumFractionDigits: 0, style: 'percent' }).format(0.25),
    )
  })
})
