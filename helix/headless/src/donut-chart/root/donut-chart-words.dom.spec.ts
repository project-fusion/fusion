import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Donut Chart speaks the locale the nearest `lang` names: its shares are
 * written and listed as that locale writes them.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

const SHARES = `<table id="shares"><thead><tr><th scope="col">Kanal</th><th scope="col">Anteil</th></tr></thead><tbody>
  <tr><th scope="row">Suche</th><td data-value="3">3</td></tr>
  <tr><th scope="row">Direkt</th><td data-value="1">1</td></tr>
</tbody></table>`

const chart = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${SHARES}<helix-headless-donut-chart for="shares"></helix-headless-donut-chart></div>`
  const host = document.querySelector('helix-headless-donut-chart') as Updatable
  await settle(host)
  return host
}

describe('donut chart locale', () => {
  test('the English summary is unchanged', async () => {
    expect(part(await chart(), 'summary')?.textContent).toBe('Suche 75%, Direkt 25%.')
  })

  test('the shares are written and listed in the locale the nearest lang names', async () => {
    const percent = new Intl.NumberFormat('de', { maximumFractionDigits: 0, style: 'percent' })
    const listed = new Intl.ListFormat('de', { style: 'short', type: 'unit' }).format([
      `Suche ${percent.format(0.75)}`,
      `Direkt ${percent.format(0.25)}`,
    ])
    expect(part(await chart('lang="de"'), 'summary')?.textContent).toBe(`${listed}.`)
  })
})
