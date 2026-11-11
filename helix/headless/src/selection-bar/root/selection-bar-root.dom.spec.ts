import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* The bar takes the toolbar's place while rows are selected, says how many,
   and clears them. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  selected: string
  updateComplete: Promise<unknown>
}

const table = async (): Promise<Table> => {
  const element =
    (await mountMarkup(`<helix-headless-data-table label="Invoices" row-key="id" selectable>
    <input slot="toolbar" aria-label="Search" />
    <helix-headless-selection-bar slot="selection"><button>Archive</button></helix-headless-selection-bar>
    <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
  await settle(element)
  return element
}

const settle = async (element: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await element.updateComplete
    await (element.querySelector('helix-headless-selection-bar') as unknown as Table).updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const slot = (element: Table, name: string): HTMLSlotElement =>
  element.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement

describe('a selection bar', () => {
  test('waits hidden while nothing is selected, and the toolbar shows', async () => {
    const element = await table()
    expect(slot(element, 'selection').hidden).toBe(true)
    expect(slot(element, 'toolbar').hidden).toBe(false)
  })

  test('takes the toolbar place while rows are selected, and says how many', async () => {
    const element = await table()
    element.selected = 'A,C'
    await settle(element)
    expect(slot(element, 'selection').hidden).toBe(false)
    expect(slot(element, 'toolbar').hidden).toBe(true)
    const bar = element.querySelector('helix-headless-selection-bar') as HTMLElement
    expect(bar.shadowRoot?.querySelector('[part="count"]')?.textContent).toBe('2 selected')
  })

  test('clears the selection, asking first', async () => {
    const element = await table()
    element.selected = 'B'
    await settle(element)
    let asked = ''
    element.addEventListener('helix-before-select', (event) => (asked = event.detail.value))
    const bar = element.querySelector('helix-headless-selection-bar') as HTMLElement
    bar.shadowRoot?.querySelector<HTMLElement>('[part="clear"]')?.click()
    await settle(element)
    expect(asked).toBe('')
    expect(element.selected).toBe('')
    expect(slot(element, 'toolbar').hidden).toBe(false)
  })
})
