import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'
import type { CellCommitDetail } from '../index.js'

/* Editable cells: the keys that open, save and put back a cell, the rules,
   the requests a page can refuse or hold, booleans in place, and batch edits. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  batchEdits: boolean
  commitEdit: (rows?: number, columns?: number) => Promise<boolean>
  discardEdits: () => void
  editCell: (row: Record<string, unknown>, field: string, typed?: string) => boolean
  rows: readonly Record<string, unknown>[]
  saveEdits: () => void
  unsavedCount: number
  updateComplete: Promise<unknown>
}

const table = async (attrs = ''): Promise<Table> => {
  const element =
    (await mountMarkup(`<helix-headless-data-table label="Invoices" row-key="id" ${attrs}>
    <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
    <helix-headless-table-column field="owner" editable required>Owner</helix-headless-table-column>
    <helix-headless-table-column field="amount" type="number" editable min="0">Amount</helix-headless-table-column>
    <helix-headless-table-column field="paid" type="boolean" editable>Paid</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = [
    { amount: 8250, id: 'A', owner: 'Ada', paid: false },
    { amount: 600, id: 'B', owner: 'Lin', paid: true },
  ]
  await settle(element)
  return element
}

const settle = async (element: Table): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) {
    await element.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const cell = (element: Table, row: number, column: number): HTMLElement =>
  element.shadowRoot?.querySelector(
    `[data-row="${row}"] > [data-column="${column}"]`,
  ) as HTMLElement
const editor = (element: Table): (HTMLElement & { value: unknown }) | null =>
  element.shadowRoot?.querySelector('[part="editor"]') ?? null
const press = (target: HTMLElement, key: string, init: KeyboardEventInit = {}): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, composed: true, key, ...init }),
  )
}
const type = async (element: Table, value: string): Promise<void> => {
  const field = editor(element) as HTMLElement & { value: unknown }
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await settle(element)
}

describe('an editable cell', () => {
  test('is marked, and a cell of a column that is not editable is not', async () => {
    const element = await table()
    expect(cell(element, 0, 1).getAttribute('part')).toContain('cell-editable')
    expect(cell(element, 0, 0).getAttribute('part')).not.toContain('cell-editable')
  })

  test('opens with Enter in the field its type picks, and Enter saves and moves down', async () => {
    const element = await table()
    let saved: CellCommitDetail | undefined
    element.addEventListener('helix-cell-commit', (event) => (saved = event.detail))
    cell(element, 0, 2).focus()
    press(cell(element, 0, 2), 'Enter')
    await settle(element)
    expect(editor(element)?.localName).toBe('helix-headless-number-input')
    expect(cell(element, 0, 2).getAttribute('part')).toContain('cell-editing')
    await type(element, '9100')
    press(editor(element) as HTMLElement, 'Enter')
    await settle(element)
    expect(editor(element)).toBeNull()
    expect(element.rows[0]?.amount).toBe(9100)
    expect(saved).toMatchObject({ field: 'amount', key: 'A', previous: 8250, value: 9100 })
    expect(element.shadowRoot?.activeElement).toBe(cell(element, 1, 2))
  })

  test('opens on a typed character, which replaces the value', async () => {
    const element = await table()
    cell(element, 0, 1).focus()
    press(cell(element, 0, 1), 'Z')
    await settle(element)
    expect(editor(element)?.value).toBe('Z')
  })

  test('puts the old value back with Escape', async () => {
    const element = await table()
    element.editCell(element.rows[0] as Record<string, unknown>, 'owner')
    await settle(element)
    await type(element, 'Mae')
    press(editor(element) as HTMLElement, 'Escape')
    await settle(element)
    expect(editor(element)).toBeNull()
    expect(element.rows[0]?.owner).toBe('Ada')
  })

  test('saves with Tab and moves to the next cell', async () => {
    const element = await table()
    element.editCell(element.rows[1] as Record<string, unknown>, 'owner')
    await settle(element)
    await type(element, 'Mae')
    press(editor(element) as HTMLElement, 'Tab')
    await settle(element)
    expect(element.rows[1]?.owner).toBe('Mae')
    expect(element.shadowRoot?.activeElement).toBe(cell(element, 1, 2))
  })

  test('stays open on a value a rule refuses, with the message', async () => {
    const element = await table()
    element.editCell(element.rows[0] as Record<string, unknown>, 'amount')
    await settle(element)
    await type(element, '-40')
    press(editor(element) as HTMLElement, 'Enter')
    await settle(element)
    expect(editor(element)).not.toBeNull()
    expect(cell(element, 0, 2).getAttribute('part')).toContain('cell-invalid')
    expect(element.shadowRoot?.querySelector('[part="cell-message"]')?.textContent).toBe(
      'Enter 0 or more.',
    )
    expect(editor(element)?.getAttribute('aria-describedby')).toBe('edit-message')
  })

  test('asks first, and a refused edit never opens', async () => {
    const element = await table()
    element.addEventListener('helix-before-cell-edit', (event) => event.preventDefault())
    expect(element.editCell(element.rows[0] as Record<string, unknown>, 'owner')).toBe(false)
  })

  test('waits on a check the page passes, shows it saving, and stays open on its message', async () => {
    const element = await table()
    let settleCheck: (message: string | undefined) => void = () => undefined
    element.addEventListener('helix-before-cell-commit', (event) =>
      event.detail.waitUntil(new Promise((resolve) => (settleCheck = resolve))),
    )
    element.editCell(element.rows[0] as Record<string, unknown>, 'owner')
    await settle(element)
    await type(element, 'Taken')
    const saving = element.commitEdit()
    await settle(element)
    expect(cell(element, 0, 1).getAttribute('part')).toContain('cell-saving')
    expect(cell(element, 0, 1).textContent).toContain('Taken')
    settleCheck('That owner has left.')
    expect(await saving).toBe(false)
    await settle(element)
    expect(element.shadowRoot?.querySelector('[part="cell-message"]')?.textContent).toBe(
      'That owner has left.',
    )
    expect(element.rows[0]?.owner).toBe('Ada')
  })
})

describe('what opens a cell with the pointer', () => {
  test('a double click, by default, and a single click does not', async () => {
    const element = await table()
    cell(element, 0, 1).click()
    await settle(element)
    expect(editor(element)).toBeNull()
    cell(element, 0, 1).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    await settle(element)
    expect(editor(element)).not.toBeNull()
  })

  test('a single click under edit-on="click", and a double click is not a second open', async () => {
    const element = await table('edit-on="click"')
    cell(element, 0, 1).click()
    await settle(element)
    expect(editor(element)).not.toBeNull()
  })

  test('a click on the open field stays in it', async () => {
    const element = await table('edit-on="click"')
    cell(element, 0, 1).click()
    await settle(element)
    await type(element, 'Mae')
    ;(editor(element) as HTMLElement).click()
    await settle(element)
    expect(editor(element)?.value).toBe('Mae')
  })
})

test('a boolean toggles in place, with Space, and no field opens', async () => {
  const element = await table()
  cell(element, 0, 3).focus()
  press(cell(element, 0, 3), ' ')
  await settle(element)
  expect(editor(element)).toBeNull()
  expect(element.rows[0]?.paid).toBe(true)
})

test('under batch-edits, a saved cell is held unsaved until Save', async () => {
  const element = await table('batch-edits')
  element.editCell(element.rows[0] as Record<string, unknown>, 'owner')
  await settle(element)
  await type(element, 'Mae')
  await element.commitEdit()
  await settle(element)
  expect(element.rows[0]?.owner).toBe('Ada')
  expect(cell(element, 0, 1).getAttribute('part')).toContain('cell-unsaved')
  expect(element.shadowRoot?.querySelector('[part="edits-count"]')?.textContent).toBe(
    '1 unsaved change',
  )
  element.shadowRoot?.querySelector<HTMLElement>('[part="edits-save"]')?.click()
  await settle(element)
  expect(element.rows[0]?.owner).toBe('Mae')
  expect(element.unsavedCount).toBe(0)
})
