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
 * Slider on the words registry: the readout of a range and the thumbs' words
 * come from `registerWords` for the page's language, and a formatted value is
 * written in that language.
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

const slider = async (around: string, attrs: string): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-slider label="Cena" ${attrs}></helix-headless-slider></div>`
  const host = document.querySelector('helix-headless-slider') as Updatable
  await settle(host)
  return host
}

describe('a slider on a page in another language', () => {
  test('joins a range and names its thumbs in the registered words', async () => {
    registerWords('pl', {
      'helix-slider': {
        maximumLabel: 'najwyżej',
        minimumLabel: 'najmniej',
        rangeText: 'od {start} do {end}',
      },
    })
    const host = await slider('lang="pl"', 'range value="10,50" show-value')
    expect(part(host, 'output')?.textContent?.trim()).toBe('od 10 do 50')
    expect(host.shadowRoot?.querySelector('#start-name')?.textContent).toBe('najmniej')
    expect(host.shadowRoot?.querySelector('#end-name')?.textContent).toBe('najwyżej')
  })

  test('writes a formatted value in the nearest `lang`', async () => {
    const host = await slider(
      'lang="de"',
      `max="5000" step="0.5" value="1234.5" show-value format-options='{"maximumFractionDigits":1}'`,
    )
    expect(part(host, 'output')?.textContent?.trim()).toBe('1.234,5')
  })

  test('keeps its English readout', async () => {
    const host = await slider('', 'range value="10,50" show-value')
    expect(part(host, 'output')?.textContent?.trim()).toBe('10 to 50')
  })
})
