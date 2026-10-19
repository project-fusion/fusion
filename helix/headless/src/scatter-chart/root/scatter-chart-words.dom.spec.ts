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
 * Scatter Chart on the words registry: each series' clause is one sentence,
 * with its count in plural forms and a whole sentence for a series with no
 * correlation, so a translation orders it as its language does.
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

const LOAD = `<table id="load">
  <thead><tr><th scope="col">Run</th><th scope="col">Rate</th><th scope="col">p50</th><th scope="col">p95</th></tr></thead>
  <tbody>
    <tr><th scope="row">1</th><td data-value="100">100</td><td data-value="10">10</td><td></td></tr>
    <tr><th scope="row">2</th><td data-value="200">200</td><td data-value="12">12</td><td></td></tr>
    <tr><th scope="row">3</th><td data-value="300">300</td><td data-value="15">15</td><td data-value="60">60</td></tr>
  </tbody>
</table>`

const chart = async (around = '', attributes = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${LOAD}<helix-headless-scatter-chart for="load" ${attributes}></helix-headless-scatter-chart></div>`
  const host = document.querySelector('helix-headless-scatter-chart') as Updatable
  await settle(host)
  return host
}

describe('scatter chart words', () => {
  test('one point is "1 point", where it was "1 points"', async () => {
    expect(part(await chart(), 'summary')?.textContent).toBe(
      'p50 / Rate: 3 points, correlation +0.99; p95 / Rate: 1 point.',
    )
  })

  test('each clause is the sentence registered for the nearest lang', async () => {
    registerWords('pl', {
      'helix-scatter-chart': {
        pointsLabel: '{count, plural, one {punkt} few {punkty} other {punktów}}',
        seriesLabel:
          '{correlation, select, none {{y} wobec {x}: {count} {pointsLabel}} other {{y} wobec {x}: {count} {pointsLabel}, korelacja {correlation}}}',
      },
    })
    expect(part(await chart('lang="pl"'), 'summary')?.textContent).toBe(
      `p50 wobec Rate: 3 punkty, korelacja ${new Intl.NumberFormat('pl', { maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: 'exceptZero' }).format(0.99)}; p95 wobec Rate: 1 punkt.`,
    )
  })

  test('a page’s own word for the points is used as it is written', async () => {
    const host = await chart('', 'points-label="runs"')
    expect(part(host, 'summary')?.textContent).toBe(
      'p50 / Rate: 3 runs, correlation +0.99; p95 / Rate: 1 runs.',
    )
  })
})
