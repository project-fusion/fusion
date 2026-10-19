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
 * Trend on the words registry: its direction and judgment are one phrase a
 * page registers for its language, a whole phrase for each judgment, and the
 * figure is written in the locale the nearest `lang` names.
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

const trend = async (around: string, attributes: string): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-trend ${attributes}></helix-headless-trend></div>`
  const host = document.querySelector('helix-headless-trend') as Updatable
  await settle(host)
  return host
}

const phrase = (host: Updatable): string => part(host, 'direction')?.textContent?.trim() ?? ''

describe('trend words', () => {
  test('each judgment is the whole phrase registered for the nearest lang', async () => {
    registerWords('de', {
      'helix-trend': {
        judgmentLabel:
          '{judgment, select, better {{direction}, und das ist gut} worse {{direction}, leider} other {{direction}}}',
        upLabel: 'Gestiegen',
      },
    })
    expect(phrase(await trend('lang="de"', 'movement="up" good="up"'))).toBe(
      'Gestiegen, und das ist gut',
    )
    expect(phrase(await trend('lang="de"', 'movement="up" good="down"'))).toBe('Gestiegen, leider')
    expect(phrase(await trend('lang="de"', 'movement="up"'))).toBe('Gestiegen')
  })

  test('the figure is written in the locale the nearest lang names', async () => {
    const host = await trend('lang="de"', 'value="-1234.5"')
    expect(part(host, 'value')?.textContent).toBe('1.234,5')
  })

  test('in English it says what it said', async () => {
    expect(phrase(await trend('', 'movement="up" good="down"'))).toBe('Up, worse')
  })
})
