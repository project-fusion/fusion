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

describe('table columns', () => {
  const table = async (extra = ''): Promise<HTMLElement> =>
    (await mount(
      `<helix-table label="Deployments" ${extra}>
        <helix-table-column width="12rem">Service</helix-table-column>
        <helix-table-column>Region</helix-table-column>
        <helix-table-row>
          <helix-table-cell header>helix-web</helix-table-cell>
          <helix-table-cell>us-east-1</helix-table-cell>
        </helix-table-row>
      </helix-table>`,
    )) as HTMLElement

  const template = (host: HTMLElement): string =>
    (part(host, 'table') as HTMLElement).getAttribute('style') ?? ''

  test('the track list comes from the columns', async () => {
    /* Declared together, because a heading and a width are two facts about one
       column. Held apart they could disagree, and the old shape could not even
       report it: `columns` took CSS, so a wrong value was an invalid track list,
       which a grid ignores in silence. */
    expect(template(await table())).toContain('12rem minmax(0, 1fr)')
  })

  test('a column with no width shares what is left', async () => {
    // `minmax(0, 1fr)` and not `1fr`: a bare `1fr` keeps an automatic minimum
    // and refuses to shrink, so one long value pushes the table past its box.
    expect(template(await table())).toContain('minmax(0, 1fr)')
  })

  test('declared columns win over the deprecated string', async () => {
    expect(template(await table('columns="1px 2px 3px"'))).not.toContain('1px 2px 3px')
  })

  test('the string still works for a table with no columns', async () => {
    const host = (await mount(
      '<helix-table columns="4rem 5rem" label="T"><helix-table-row></helix-table-row></helix-table>',
    )) as HTMLElement
    expect(template(host)).toContain('4rem 5rem')
  })

  test('a column is a column header, through internals', async () => {
    const host = await table()
    const column = host.querySelector('helix-table-column') as HTMLElement
    expect(role(column)).toBe('columnheader')
    expect(column.hasAttribute('role')).toBe(false)
  })
})
