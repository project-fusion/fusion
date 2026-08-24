import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Column = HTMLElement & { isTableColumn: boolean; track: string; width: string }

const column = async (attributes = ''): Promise<Column> =>
  (await mount(
    `<helix-headless-table-column ${attributes}>Appearance</helix-headless-table-column>`,
  )) as Column

/**
 * One column, and the contract that is the column's rather than the table's.
 *
 * **The table already proves that the tracks add up**, which is what the column
 * replaced a `columns` string to fix: the column is named 14 times in this
 * family's specs. What the column owns alone is the track it contributes when
 * nobody said, and that default is not a detail. A bare `1fr` keeps an automatic
 * minimum and refuses to shrink under a long cell, so one unbreakable value
 * pushes the whole table past its container, and a table-level spec sees a table
 * that renders rather than a table that will fail on somebody's data.
 */
describe('one table column', () => {
  /* `minmax(0, 1fr)` rather than `1fr`, which is the difference between a column
     that shares what is left and a column that grows to fit its longest cell. */
  test('shares what is left over rather than growing to its longest cell', async () => {
    expect((await column()).track).toBe('minmax(0, 1fr)')
  })

  /* Anything valid in a track list works, and the column hands it through
     untouched: the table composes the list and does not parse the parts. */
  test('hands through whatever track it was given', async () => {
    expect((await column('width="16rem"')).track).toBe('16rem')
    expect((await column('width="auto"')).track).toBe('auto')
    expect((await column('width="minmax(0, 2fr)"')).track).toBe('minmax(0, 2fr)')
  })

  /* The heading is a grid item of the table rather than something in a wrapper
     that has to be kept the same width as the cells under it, and the role is on
     the host beside its siblings' for the same reason theirs are: the flat tree
     is where the table's structure is read from. A column and a cell marked
     `header` both come out `columnheader`, which is deliberate: a table whose
     headings carry widths uses one, and a plain one uses the other. */
  test('draws its heading, and is the heading on its host', async () => {
    const host = await column()
    expect(part(host, 'column')?.querySelector('slot')).not.toBeNull()
    expect(role(host)).toBe('columnheader')
    expect(host.shadowRoot?.querySelector('[role]')).toBeNull()
  })

  /* The table finds its columns across the light DOM by this flag rather than by
     `instanceof`, which is cheaper and survives two copies of the module. */
  test('is identifiable by its parent without an instanceof', async () => {
    expect((await column()).isTableColumn).toBe(true)
  })
})
