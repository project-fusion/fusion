import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * Table on the words registry: the table and its columns speak the words
 * registered for the page's language, the sort sentence is whole for each
 * order, and a column's width is a count with plural forms.
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

type Updating = HTMLElement & { sort: string; updateComplete: Promise<boolean> }

/* An update, and then the observer's turn, as the table's own specs wait. */
const settle = async (host: Updating): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await host.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 0))
  await host.updateComplete
}

/** A sortable, selectable table in a container whose attributes set the page's language. */
const table = async (around = '', extra = 'label="Services"'): Promise<Updating> => {
  document.body.innerHTML = `<div ${around}><helix-headless-table selectable ${extra}>
    <helix-headless-table-column resizable>Service</helix-headless-table-column>
    <helix-headless-table-column sortable field="count">Count</helix-headless-table-column>
    <helix-headless-table-row id="web">
      <helix-headless-table-cell header>web-app</helix-headless-table-cell>
      <helix-headless-table-cell>1,204</helix-headless-table-cell>
    </helix-headless-table-row>
  </helix-headless-table></div>`
  const host = document.querySelector('helix-headless-table') as Updating
  await settle(host)
  return host
}

const column = (host: HTMLElement, at: number): Updating =>
  host.querySelectorAll('helix-headless-table-column')[at] as unknown as Updating

const sortBy = async (host: Updating, sort: string): Promise<string> => {
  host.sort = sort
  await settle(host)
  return part(host, 'live')?.textContent?.trim() ?? ''
}

const POLISH = {
  'helix-table': {
    fallbackLabel: 'Tabela',
    selectAllLabel: 'Zaznacz wszystkie wiersze',
    sortedLabel:
      '{direction, select, ascending {Posortowano rosnąco: {column}} descending {Posortowano malejąco: {column}} other {Posortowano: {column}}}',
  },
  'helix-table-column': {
    widthLabel:
      '{width, plural, one {# piksel} few {# piksele} many {# pikseli} other {# piksela}}',
  },
}

describe('a table on a page in another language', () => {
  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('pl', POLISH)
    const host = await table('lang="pl"')
    expect(part(host, 'checkbox')?.getAttribute('aria-label')).toBe('Zaznacz wszystkie wiersze')
  })

  test('names itself with its word where it has no `label`', async () => {
    registerWords('pl', POLISH)
    const host = await table('lang="pl"', '')
    expect(part(host, 'table')?.getAttribute('aria-label')).toBe('Tabela')
  })

  test('says each order of a sort in its own whole sentence', async () => {
    registerWords('pl', POLISH)
    const host = await table('lang="pl"')
    expect(await sortBy(host, 'count:desc')).toBe('Posortowano malejąco: Count')
    expect(await sortBy(host, 'count:asc')).toBe('Posortowano rosnąco: Count')
  })

  test('a column counts its width in the language’s forms', async () => {
    registerWords('pl', POLISH)
    const host = await table('lang="pl"')
    const resizer = part(column(host, 0), 'resizer')
    expect(resizer?.getAttribute('aria-valuetext')).toBe('48 pikseli')
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await table('lang="pl"')
    registerWords('pl', POLISH)
    await settle(host)
    expect(part(host, 'checkbox')?.getAttribute('aria-label')).toBe('Zaznacz wszystkie wiersze')
  })
})

describe('the sentences a table says in English', () => {
  test('are as before', async () => {
    const host = await table()
    expect(await sortBy(host, 'count:asc')).toBe('Sorted by Count, ascending')
    expect(await sortBy(host, 'count:desc')).toBe('Sorted by Count, descending')
    expect(part(column(host, 0), 'resizer')?.getAttribute('aria-valuetext')).toBe('48 pixels')
  })

  /* The value is held to the floor and its words read the raw drawn width, so
     a heading not drawn yet said 48 and "0 pixels" at once. */
  test('say the width the separator reports as its value', async () => {
    const host = await table()
    const resizer = part(column(host, 0), 'resizer')
    expect(resizer?.getAttribute('aria-valuetext')).toBe(
      `${resizer?.getAttribute('aria-valuenow')} pixels`,
    )
  })

  test('still fill `{order}` in a page’s own sentence', async () => {
    const host = await table('', 'label="Services" sorted-label="By {column} ({order})"')
    expect(await sortBy(host, 'count:desc')).toBe('By Count (descending)')
  })

  test('name a column without a heading by the column', async () => {
    const host = await table()
    const unnamed = document.createElement('helix-headless-table-column') as unknown as Updating & {
      movable: boolean
    }
    unnamed.setAttribute('resizable', '')
    host.append(unnamed)
    unnamed.movable = true
    await settle(unnamed)
    expect(part(unnamed, 'grip')?.getAttribute('aria-label')).toBe('Move column')
    expect(part(unnamed, 'resizer')?.getAttribute('aria-label')).toBe('Resize column')
    expect(part(column(host, 0), 'resizer')?.getAttribute('aria-label')).toBe('Resize Service')
  })
})
