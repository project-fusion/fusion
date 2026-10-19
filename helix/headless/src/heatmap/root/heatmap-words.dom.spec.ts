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
 * Heatmap on the words registry: its overview, its count of selected cells
 * and the strip's fallback name come from `registerWords` for the page's
 * language, and the count picks the language's plural form.
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

const DAYS = `<table id="days" data-hidden-visually><tbody>
  ${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    .map(
      (day, at) =>
        `<tr><th scope="row">${day}</th><td data-value="${at * 700}">${at * 700}</td></tr>`,
    )
    .join('')}
</tbody></table>`

const strip = async (around = '', attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${DAYS}<helix-headless-heatmap for="days" ${attributes}></helix-headless-heatmap></div>`
  const host = document.querySelector('helix-headless-heatmap') as Updatable
  await settle(host)
  return host
}

const key = (host: Updatable, name: string, shiftKey = false): void => {
  part(host, 'strip')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: name,
      shiftKey,
    }),
  )
}

/** Waits for the `selection` part, which speaks a frame after the change. */
const spoken = async (host: Updatable): Promise<string> => {
  await settle(host)
  await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  await settle(host)
  return part(host, 'selection')?.textContent ?? ''
}

const POLISH = {
  'helix-heatmap': {
    busiestLabel: 'Najwięcej',
    overviewLabel: '{busiestLabel}: {busiest}. {totalLabel}: {total}.',
    selectionLabel:
      '{count, plural, one {# zaznaczony} few {# zaznaczone} many {# zaznaczonych} other {# zaznaczonego}}',
    stripLabel: 'Mapa cieplna',
    totalLabel: 'Razem',
  },
}

describe('heatmap words', () => {
  test('the overview is the sentence registered for the nearest lang, its total in that locale', async () => {
    registerWords('pl', POLISH)
    const host = await strip('lang="pl"')
    expect(part(host, 'overview')?.textContent).toBe(
      `Najwięcej: Sa, 3500. Razem: ${new Intl.NumberFormat('pl').format(10500)}.`,
    )
  })

  test('a strip with no name is named by the registered word', async () => {
    registerWords('pl', POLISH)
    expect(part(await strip('lang="pl"'), 'strip')?.getAttribute('aria-label')).toBe('Mapa cieplna')
    expect(part(await strip(), 'strip')?.getAttribute('aria-label')).toBe('Heatmap')
  })

  test('the count of selected cells takes the language’s plural form', async () => {
    registerWords('pl', POLISH)
    const host = await strip('lang="pl"', 'selection-mode="multiple"')
    key(host, 'Home')
    key(host, ' ')
    key(host, 'ArrowRight', true)
    expect(await spoken(host)).toBe('2 zaznaczone')
    for (let step = 0; step < 3; step++) {
      key(host, 'ArrowRight', true)
    }
    expect(await spoken(host)).toBe('5 zaznaczonych')
  })

  test('in English, one cell is "1 selected", as before', async () => {
    const host = await strip('', 'selection-mode="multiple"')
    key(host, 'Home')
    key(host, ' ')
    expect(await spoken(host)).toBe('1 selected')
  })
})
