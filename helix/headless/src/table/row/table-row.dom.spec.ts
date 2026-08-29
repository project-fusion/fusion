import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const row = async (): Promise<HTMLElement> =>
  (await mount(
    '<helix-headless-table-row><helix-headless-table-cell>solid</helix-headless-table-cell></helix-headless-table-row>',
  )) as HTMLElement

/**
 * One row, and the contract that is the row's rather than the table's.
 *
 * **The table already proves the layout**, which is the row's cells becoming
 * items of the table's own grid so every column lines up. What the row owns
 * alone is the thing that layout takes away. `display: contents` removes the
 * row's box, and a spec that reads the grid cannot tell a table with rows from
 * a table with only cells, because they lay out identically. That is the whole
 * failure this asserts against: a table with cells and no rows is broken rather
 * than plain.
 */
describe('one table row', () => {
  test('is still a row after its box is gone', async () => {
    expect(role(await row())).toBe('row')
  })

  /* On the host, because that is where the flat tree puts it between the table
     and the cells. Inside the shadow root it would be a row containing the
     cells' *slot* rather than the cells. */
  test('carries the role where the structure needs it, not inside its own root', async () => {
    const host = await row()
    expect(host.shadowRoot?.querySelector('[role]')).toBeNull()
    expect(host.shadowRoot?.querySelector('slot')).not.toBeNull()
  })
})
