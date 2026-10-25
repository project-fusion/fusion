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
 * Meter on the words registry: its name, its band words and the sentence
 * `live` says come from `registerWords` for the page's language, and the
 * reading is written in the locale the nearest `lang` names.
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

type Meter = Updatable & { bandLabels: Record<string, string>; value: number }

const meter = async (around = '', attributes = ''): Promise<Meter> => {
  document.body.innerHTML = `<div ${around}><helix-headless-meter live low="25" high="50" optimum="0" value="10" ${attributes}></helix-headless-meter></div>`
  const host = document.querySelector('helix-headless-meter') as Meter
  await settle(host)
  return host
}

const said = async (host: Meter, value: number): Promise<string> => {
  host.value = value
  await settle(host)
  await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  await settle(host)
  return part(host, 'live')?.textContent ?? ''
}

const FRENCH = {
  'helix-meter': {
    bandLabels: { poor: 'Presque plein' },
    liveLabel: '{band} : {reading}',
  },
}

describe('meter words', () => {
  test('the live sentence is the words registered for the nearest lang', async () => {
    registerWords('fr', FRENCH)
    const host = await meter('lang="fr"')
    expect(await said(host, 92)).toBe(
      `Presque plein : ${new Intl.NumberFormat('fr', { maximumFractionDigits: 0, style: 'percent' }).format(0.92)}`,
    )
  })

  test('a band left out of a table keeps its English, and a page’s entry wins', async () => {
    registerWords('fr', FRENCH)
    const host = await meter('lang="fr"', `band-labels='{"poor":"Plein"}'`)
    expect(host.bandLabels).toEqual({ fair: 'Fair', good: 'Good', poor: 'Plein' })
  })

  test('in English it says what it said', async () => {
    expect(await said(await meter(), 92)).toBe('92%, Poor')
  })
})
