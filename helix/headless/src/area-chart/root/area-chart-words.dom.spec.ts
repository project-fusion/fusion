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
 * Area Chart on the words registry: its summary is one sentence a page can
 * register for its language, and the numbers in it are written in the
 * locale the nearest `lang` names.
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

const SOURCES = `<table id="sources">
  <thead><tr><th scope="col">Month</th><th scope="col">Search</th><th scope="col">Direct</th></tr></thead>
  <tbody>
    <tr><th scope="row">Feb</th><td data-value="1000">1000</td><td data-value="500">500</td></tr>
    <tr><th scope="row">Mar</th><td data-value="1500">1500</td><td data-value="500">500</td></tr>
  </tbody>
</table>`

const chart = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${SOURCES}<helix-headless-area-chart for="sources"></helix-headless-area-chart></div>`
  const host = document.querySelector('helix-headless-area-chart') as Updatable
  await settle(host)
  return host
}

const summary = (host: Updatable): string => part(host, 'summary')?.textContent ?? ''

describe('area chart words', () => {
  test('the English summary is unchanged', async () => {
    expect(summary(await chart())).toBe('Mar: Total 2,000; Search 75%, Direct 25%.')
  })

  test('the summary is the sentence registered for the nearest lang, its numbers in that locale', async () => {
    registerWords('de', {
      'helix-area-chart': {
        summaryLabel: 'Im {reading}: {totalLabel} {total} ({shares}).',
        totalLabel: 'Summe',
      },
    })
    const host = await chart('lang="de"')
    expect(summary(host)).toBe(
      `Im Mar: Summe 2.000 (${new Intl.ListFormat('de', { style: 'short', type: 'unit' }).format([
        `Search ${new Intl.NumberFormat('de', { style: 'percent' }).format(0.75)}`,
        `Direct ${new Intl.NumberFormat('de', { style: 'percent' }).format(0.25)}`,
      ])}).`,
    )
  })

  test('a page’s own words win over the registry', async () => {
    registerWords('de', { 'helix-area-chart': { totalLabel: 'Summe' } })
    const host = await chart('lang="de"')
    host.setAttribute('total-label', 'Gesamt')
    await settle(host)
    expect(summary(host)).toContain('Mar: Gesamt 2.000;')
  })
})
