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
 * Data Table on the words registry: its sentences come from `registerWords`
 * for the page's language, its counts are plural messages, and the numbers
 * in them are written in the locale its words are in.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
  await import('../../table/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

interface Table extends Updatable {
  filter: string
  rows: readonly Record<string, unknown>[]
  selected: string
  sort: string
}

/** A table in a container whose attributes set the page's language. */
const table = async (around = '', attrs = ''): Promise<Table> => {
  document.body.innerHTML = `<div ${around}><helix-headless-data-table selectable row-key="id" ${attrs}>
    <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
  </helix-headless-data-table></div>`
  const element = document.querySelector('helix-headless-data-table') as Table
  element.rows = Array.from({ length: 1500 }, (_, at) => ({ id: `r${at}`, name: `row ${at}` }))
  await settle(element)
  return element
}

const said = (element: Table): string =>
  element.shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''

const POLISH = {
  'helix-data-table': {
    resultsLabel:
      '{count, plural, one {# wiersz} few {# wiersze} many {# wierszy} other {# wiersza}}',
    selectedLabel:
      '{count, plural, one {# wybrany} few {# wybrane} many {# wybranych} other {# wybranego}}',
    sortedLabel:
      '{direction, select, ascending {Posortowano rosnąco według {column}} descending {Posortowano malejąco według {column}} other {Posortowano według {column}}}',
  },
}

describe('a data table on a page in another language', () => {
  test('counts the rows a search leaves with the language’s own forms', async () => {
    registerWords('pl', POLISH)
    const element = await table('lang="pl"')
    element.filter = 'row 1'
    await settle(element)
    /* "row 1", "row 1x", "row 1xx" and "row 1xxx" to 1499: 611 rows. */
    expect(said(element)).toBe('611 wierszy')
    element.filter = 'row 12'
    await settle(element)
    expect(said(element)).toBe('111 wierszy')
    element.filter = 'row 1499'
    await settle(element)
    expect(said(element)).toBe('1 wiersz')
  })

  test('writes its numbers in the locale', async () => {
    registerWords('de', { 'helix-data-table': { selectedLabel: '{count} ausgewählt' } })
    const element = await table('lang="de"')
    element.selected = Array.from({ length: 1200 }, (_, at) => `r${at}`).join(',')
    await settle(element)
    expect(said(element)).toBe('1.200 ausgewählt')
  })

  test('says a whole sentence for each sort order', async () => {
    registerWords('pl', POLISH)
    const element = await table('lang="pl"')
    element.sort = 'name:desc'
    await settle(element)
    expect(said(element)).toBe('Posortowano malejąco według Name')
  })

  test('speaks its `locale` before the nearest `lang`, and tells its pagination', async () => {
    registerWords('pl', POLISH)
    const element = await table('lang="de"', 'locale="pl" page-size="10"')
    element.selected = 'r1,r2'
    await settle(element)
    expect(said(element)).toBe('2 wybrane')
    expect(part(element as unknown as HTMLElement, 'pagination')?.getAttribute('locale')).toBe('pl')
  })

  test('updates its drawn words once they are registered', async () => {
    const element = await table('lang="de"', 'page-size="10"')
    const pagination = (): Element | null => part(element as unknown as HTMLElement, 'pagination')
    expect(pagination()?.getAttribute('next-label')).toBe('Next page')
    registerWords('de', { 'helix-data-table': { nextLabel: 'Nächste Seite' } })
    await Promise.resolve()
    await settle(element)
    expect(pagination()?.getAttribute('next-label')).toBe('Nächste Seite')
  })
})

describe('the sentences a data table says in English', () => {
  test('are unchanged, with numbers grouped', async () => {
    const element = await table()
    element.filter = 'row'
    await settle(element)
    expect(said(element)).toBe('1,500 results')
    element.sort = 'name:asc'
    await settle(element)
    expect(said(element)).toBe('Sorted by Name, ascending')
  })

  test('still take the deprecated sentence for one row, where a page sets it', async () => {
    const element = await table('', 'result-label="Just {count} row"')
    element.filter = 'row 1499'
    await settle(element)
    expect(said(element)).toBe('Just 1 row')
    element.filter = 'row 149'
    await settle(element)
    expect(said(element)).toBe('11 results')
  })
})
