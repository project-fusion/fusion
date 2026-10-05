import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  idle,
  mount,
  part,
  registerDom,
  role,
  settle,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Cell = HTMLElement & { header: boolean; updateComplete: Promise<boolean> }

const cell = async (attributes = ''): Promise<Cell> =>
  (await mount(
    `<helix-headless-table-cell ${attributes}>solid</helix-headless-table-cell>`,
  )) as Cell

/**
 * One cell, and the contract that is the cell's rather than the table's.
 *
 * **The table already proves the arrangement**, which is the tracks lining up
 * and the columns deciding them. What the cell owns alone is that it is a cell
 * *to anything reading the page*, and that assertion has nowhere else to live:
 * a grid of divs looks exactly like a table until a screen reader is pointed at
 * it, and the table's own specs read the layout rather than the semantics.
 */
describe('one table cell', () => {
  /* The role is on the host, not inside the shadow root, because the cell has to
     be a child of its row in the flat tree for the structure to hold. Through
     `ElementInternals`, which writes no attribute, so this is unreadable without
     asking the internals. */
  test('is a cell on its host, where its row can see it', async () => {
    const host = await cell()
    expect(role(host)).toBe('cell')
    expect(host.shadowRoot?.querySelector('[role]')).toBeNull()
  })

  /* `header` is what lets a reader hear "Attribute, appearance" rather than the
     bare value, so the two roles are one property apart and both are the cell's
     to decide. */
  test('heads its column when it is told to, and answers to the other role', async () => {
    expect(role(await cell('header'))).toBe('columnheader')

    const host = await cell()
    host.header = true
    await host.updateComplete
    expect(role(host)).toBe('columnheader')
  })

  /* The first cell of a row of values names that row, which is what every
     shipped example writes `header` for. As a `columnheader` it stacked a
     second heading under the column's, and a reader moving along the row heard
     no row header at all. */
  test('heads its row where values sit beside it, and its column in a row of headers', async () => {
    const values = await mount(`<helix-headless-table-row>
      <helix-headless-table-cell header>web-app</helix-headless-table-cell>
      <helix-headless-table-cell>us-east-1</helix-headless-table-cell>
    </helix-headless-table-row>`)
    await settle(values.firstElementChild as Cell)
    const [named, value] = [...values.children] as Cell[]
    expect(role(named as Cell)).toBe('rowheader')
    expect(role(value as Cell)).toBe('cell')

    const headers = await mount(`<helix-headless-table-row>
      <helix-headless-table-cell header>Service</helix-headless-table-cell>
      <helix-headless-table-cell header>Region</helix-headless-table-cell>
    </helix-headless-table-row>`)
    await settle(headers.firstElementChild as Cell)
    expect([...headers.children].map((one) => role(one as Cell))).toEqual([
      'columnheader',
      'columnheader',
    ])

    /* The value beside it becoming a header too turns the row into a row of
       headers, and the first cell hears about it. */
    const second = value as Cell
    second.header = true
    await second.updateComplete
    await (named as Cell).updateComplete
    expect(role(named as Cell)).toBe('columnheader')
  })

  /* A cell generates no box: it is a grid item of the table, so what it renders
     is the slot and nothing around it. A wrapper here is what would break the
     column alignment the table spends its own specs proving. */
  test('renders nothing around what it was given', async () => {
    const host = await cell()
    expect(host.shadowRoot?.querySelector('slot')).not.toBeNull()
    expect(part(host, 'cell')).toBeNull()
  })

  /* Browser only: happy-dom fires no `slotchange`. Text of its own is what makes
     the content flow as a line; a cell of elements alone keeps the flex layout a
     lone tag or button is centered by. */
  ;(hasLayout() ? test : test.skip)('says when it holds text of its own', async () => {
    const mixed = await mount(
      '<helix-headless-table-cell>Ships <code>vue.d.ts</code></helix-headless-table-cell>',
    )
    await idle()
    expect(hasState(mixed, 'text')).toBe(true)

    const elements = await mount(
      '<helix-headless-table-cell> <span>solid</span> </helix-headless-table-cell>',
    )
    await idle()
    expect(hasState(elements, 'text')).toBe(false)
  })
})
