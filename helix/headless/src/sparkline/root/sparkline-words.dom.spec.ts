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
 * Sparkline on the words registry: its overview and the place a reading
 * stands come from `registerWords` for the page's language, with the numbers
 * written in the locale the nearest `lang` names.
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

const spark = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-sparkline label="Sitzungen" values="1240 1318 1102"></helix-headless-sparkline></div>`
  const host = document.querySelector('helix-headless-sparkline') as Updatable
  await settle(host)
  return host
}

const press = async (host: Updatable, key: string): Promise<void> => {
  part(host, 'svg')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
  await settle(host)
}

const GERMAN = {
  'helix-sparkline': {
    overviewLabel: 'Von {first} bis {last}, höchstens {high}, mindestens {low}',
    positionLabel: '{position} von {count}',
  },
}

describe('sparkline words', () => {
  test('the overview is the sentence registered for the nearest lang', async () => {
    registerWords('de', GERMAN)
    expect(part(await spark('lang="de"'), 'overview')?.textContent).toBe(
      'Von 1.240 bis 1.102, höchstens 1.318, mindestens 1.102',
    )
  })

  test('the readout says where a reading stands in the registered words', async () => {
    registerWords('de', GERMAN)
    const host = await spark('lang="de"')
    await press(host, 'End')
    expect(part(host, 'live')?.textContent).toBe('1.102 (3 von 3)')
  })

  test('registering words later updates a sparkline already drawn', async () => {
    const host = await spark('lang="de"')
    expect(part(host, 'overview')?.textContent).toBe(
      'From 1.240 to 1.102, highest 1.318, lowest 1.102',
    )
    registerWords('de', GERMAN)
    await settle(host)
    expect(part(host, 'overview')?.textContent).toBe(
      'Von 1.240 bis 1.102, höchstens 1.318, mindestens 1.102',
    )
  })
})
