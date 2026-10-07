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
 * Bar Chart on the words registry: its summary is one sentence a page can
 * register for its language, and its axis is written in the locale the
 * nearest `lang` names.
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

const SALES = `<table id="sales">
  <thead><tr><th scope="col">Quarter</th><th scope="col">Sales</th></tr></thead>
  <tbody>
    <tr><th scope="row">Q1</th><td data-value="1200">1,200</td></tr>
    <tr><th scope="row">Q2</th><td data-value="4800">4,800</td></tr>
  </tbody>
</table>`

/** Two series, the second on a scale of its own, which draws both axes. */
const TWO = `<table id="sales">
  <thead><tr><th scope="col">Quarter</th><th scope="col">Sales</th><th scope="col">Margin</th></tr></thead>
  <tbody>
    <tr><th scope="row">Q1</th><td data-value="1200">1,200</td><td data-value="2">2</td></tr>
    <tr><th scope="row">Q2</th><td data-value="4800">4,800</td><td data-value="3">3</td></tr>
  </tbody>
</table>`

const chart = async (around = '', table = SALES, attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${table}<helix-headless-bar-chart for="sales" ${attributes}></helix-headless-bar-chart></div>`
  const host = document.querySelector('helix-headless-bar-chart') as Updatable
  await settle(host)
  return host
}

const ticks = (host: Updatable): string[] =>
  [...(host.shadowRoot?.querySelectorAll('[part="tick"]') ?? [])].map(
    (tick) => tick.textContent?.trim() ?? '',
  )

describe('bar chart words', () => {
  test('the English summary is unchanged', async () => {
    expect(part(await chart(), 'summary')?.textContent).toBe('Highest: Sales Q2 4,800.')
  })

  test('the summary is the sentence registered for the nearest lang', async () => {
    registerWords('de', {
      'helix-bar-chart': { summaryLabel: 'Spitzenwerte: {readings}.' },
    })
    expect(part(await chart('lang="de"'), 'summary')?.textContent).toBe(
      'Spitzenwerte: Sales Q2 4,800.',
    )
  })

  test('the axis is written in the locale the nearest lang names', async () => {
    expect(ticks(await chart('lang="de"', TWO, 'secondary="Margin"'))).toContain('4.000')
  })
})
