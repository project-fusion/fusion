import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* A search paints its matches with the Custom Highlight API, in the cells it
   reads, and says how many of every row it left. happy-dom has no registry,
   so the spec gives it one that keeps the ranges. */

const painted = new Map<string, { ranges: Range[] }>()

beforeAll(async () => {
  registerDom()
  ;(globalThis as { Highlight?: unknown }).Highlight = class {
    ranges: Range[]
    constructor(...ranges: Range[]) {
      this.ranges = ranges
    }
  }
  /* `CSS` may be a new object on each read, so the registry goes on its prototype. */
  Object.defineProperty(Object.getPrototypeOf(globalThis.CSS), 'highlights', {
    configurable: true,
    get: () => painted,
  })
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  updateComplete: Promise<unknown>
}

const table = async (searchable = ''): Promise<Table> => {
  const element = (await mountMarkup(`<helix-headless-data-table label="People">
    <helix-headless-table-column field="name" ${searchable}>Name</helix-headless-table-column>
    <helix-headless-table-column field="city">City</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = [
    { city: 'Adelaide', name: 'Ada' },
    { city: 'Lima', name: 'Lin' },
  ]
  await settle(element)
  return element
}

const settle = async (element: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await element.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const marked = (): string[] =>
  (painted.get('helix-filter-match')?.ranges ?? []).map((range) => range.toString())

test('a search marks where it matches, and an empty one takes the marks away', async () => {
  const element = await table()
  element.search('ad')
  await settle(element)
  expect(marked()).toEqual(['Ad', 'Ad'])
  element.search('')
  await settle(element)
  expect(marked()).toEqual([])
})

test('marks only the columns it reads, once one is searchable', async () => {
  const element = await table('searchable')
  element.search('ad')
  await settle(element)
  expect(marked()).toEqual(['Ad'])
  element.remove()
})

test('says how many of every row it left', async () => {
  const element = await table()
  element.search('li')
  await settle(element)
  expect(element.shadowRoot?.querySelector('[part="live"]')?.textContent).toContain('1 of 2 rows')
})
