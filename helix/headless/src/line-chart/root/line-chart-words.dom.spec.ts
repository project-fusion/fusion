import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Line Chart speaks the locale the nearest `lang` names: the latest readings
 * in its summary are listed as that locale lists them.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

const VISITS = `<table id="visits"><thead><tr><th scope="col">Monat</th><th scope="col">Web</th><th scope="col">App</th><th scope="col">Mail</th></tr></thead><tbody>
  <tr><th scope="row">Jan</th><td data-value="1">1</td><td data-value="2">2</td><td data-value="3">3</td></tr>
  <tr><th scope="row">Feb</th><td data-value="4">4</td><td data-value="5">5</td><td data-value="6">6</td></tr>
</tbody></table>`

const chart = async (around = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}>${VISITS}<helix-headless-line-chart for="visits"></helix-headless-line-chart></div>`
  const host = document.querySelector('helix-headless-line-chart') as Updatable
  await settle(host)
  return host
}

describe('line chart locale', () => {
  test('the English summary is unchanged', async () => {
    expect(part(await chart(), 'summary')?.textContent).toBe('Feb: Web 4, App 5, Mail 6.')
  })

  test('the readings are listed as the locale the nearest lang names lists them', async () => {
    const listed = new Intl.ListFormat('ar', { style: 'short', type: 'unit' }).format([
      'Web 4',
      'App 5',
      'Mail 6',
    ])
    expect(part(await chart('lang="ar"'), 'summary')?.textContent).toBe(`Feb: ${listed}.`)
  })
})

/* The words beside a page of the table drawn from data are a page's to
   translate, as the position a key reads out is. */
describe('the pages of the table drawn from data', () => {
  test('say the words registered for the family, with the numbers in its locale', async () => {
    const { clearWords, registerWords } = await import('@fusion.dev/helix-core')
    registerWords('de', {
      'helix-line-chart': {
        nextReadingsLabel: 'Nächste Messwerte',
        readingsLabel: 'Messwerte {first} bis {last} von {count}',
      },
    })
    try {
      document.body.innerHTML =
        '<div lang="de"><helix-headless-line-chart></helix-headless-line-chart></div>'
      const host = document.querySelector('helix-headless-line-chart') as Updatable & {
        data: unknown
      }
      host.data = {
        columns: ['Zeit', 'Last'],
        rows: Array.from({ length: 1500 }, (_, at) => [`t${at}`, at % 7]),
      }
      await settle(host)
      const pages = part(host, 'table-pages')
      expect(pages?.querySelector('[role="status"]')?.textContent?.trim()).toBe(
        'Messwerte 1 bis 200 von 1.500',
      )
      expect(pages?.querySelectorAll('button')[1]?.textContent).toBe('Nächste Messwerte')
    } finally {
      clearWords()
    }
  })
})
