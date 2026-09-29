import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * A sort and a change to the chosen rows are said, once each, after they happen.
 *
 * **Before, neither was.** A sort moved `aria-sort` on the heading and a chosen
 * row ticked its box, and a reader on the heading's button or the box heard no
 * sentence saying the rows under them had moved or how many were chosen.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends Updatable {
  rows: readonly Record<string, unknown>[]
  selected: string
  sort: string
}

const table = async (attrs = ''): Promise<Table> => {
  const element = (await mount(`<helix-headless-data-table selectable row-key="id" ${attrs}>
    <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
    <helix-headless-table-column field="size">Size</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = [
    { id: 'a', name: 'alpha', size: 30 },
    { id: 'b', name: 'bravo', size: 4 },
    { id: 'c', name: 'charlie', size: 1000 },
  ]
  await settle(element)
  return element
}

const said = (element: Table): string =>
  element.shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''

describe('a data table saying what changed', () => {
  test('says nothing as it arrives, whatever it arrives sorted by', async () => {
    expect(said(await table('default-sort="name:asc"'))).toBe('')
  })

  test('says a sort by the column heading and the order', async () => {
    const element = await table()
    element.sort = 'name:desc'
    await settle(element)
    expect(said(element)).toBe('Sorted by Name, descending')
    element.sort = ''
    await settle(element)
    expect(said(element)).toBe('Not sorted')
  })

  test('says how many rows are chosen', async () => {
    const element = await table()
    element.selected = 'a,c'
    await settle(element)
    expect(said(element)).toBe('2 selected')
  })

  test('says it in the words it is given', async () => {
    const element = await table(
      'sorted-label="Nach {column} sortiert, {order}" ascending-label="aufsteigend"',
    )
    element.sort = 'name:asc'
    await settle(element)
    expect(said(element)).toBe('Nach Name sortiert, aufsteigend')
  })
})
