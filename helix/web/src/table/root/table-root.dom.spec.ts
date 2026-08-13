import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `
  <helix-table columns="10rem 1fr" label="Attributes">
    <helix-table-row>
      <helix-table-cell header>Name</helix-table-cell>
      <helix-table-cell header>Description</helix-table-cell>
    </helix-table-row>
    <helix-table-row>
      <helix-table-cell>appearance</helix-table-cell>
      <helix-table-cell>How the card separates itself.</helix-table-cell>
    </helix-table-row>
  </helix-table>`

describe('table structure', () => {
  test('the whole chain a screen reader walks is present', async () => {
    // A grid of divs is not a table to anything reading it, so every role is
    // declared. Cells with no rows between them is a broken table, not a
    // plain one.
    const table = await mount(markup)
    expect(part(table, 'table')?.getAttribute('role')).toBe('table')
    for (const row of table.querySelectorAll('helix-table-row')) {
      expect(role(row)).toBe('row')
    }
    const cells = [...table.querySelectorAll('helix-table-cell')]
    expect(role(cells[0] as HTMLElement)).toBe('columnheader')
    expect(role(cells[2] as HTMLElement)).toBe('cell')
  })

  test('the table is named', async () => {
    const table = await mount(markup)
    expect(part(table, 'table')?.getAttribute('aria-label')).toBe('Attributes')
  })

  test('rows generate no box, so their cells join the table grid', async () => {
    // This is what aligns every column across every row. The row still exists
    // as an element, which a <table> gives away when the table algorithm owns
    // its cells.
    const table = await mount(markup)
    const row = table.querySelector('helix-table-row') as HTMLElement
    expect(getComputedStyle(row).display).toBe('contents')
  })

  test('the column track list reaches the grid', async () => {
    const table = await mount(markup)
    expect(part(table, 'table')?.getAttribute('style')).toContain('10rem 1fr')
  })
})
