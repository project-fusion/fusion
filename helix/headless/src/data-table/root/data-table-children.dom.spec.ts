import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { QUIET } from '@fusion.dev/helix-core/audits/children'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A column is the Table family's, and a page that writes one imports
   `@fusion.dev/helix-headless/table` beside the data table. The data table
   does not register it, and says so in development where it is missing. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Report = { kind: string; message: string }

/** What the runtime log heard while `markup` mounted and the page painted. */
const told = async (markup: string): Promise<Report[]> => {
  const key = Symbol.for('fusion.dev/helix/runtime-log')
  const log = (globalThis as Record<symbol, unknown>)[key]
  const before = Array.isArray(log) ? log.length : 0
  document.body.innerHTML = markup
  await settle(document.body.firstElementChild as Updatable)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  /* The audit reports once the page has gone quiet for `QUIET` milliseconds. */
  await new Promise((resolve) => setTimeout(resolve, QUIET + 50))
  const after = (globalThis as Record<symbol, unknown>)[key]
  return ((Array.isArray(after) ? after.slice(before) : []) as Report[]).filter(
    (one) => one.kind === 'unregistered-part',
  )
}

describe('a data table whose columns were never imported', () => {
  /* A tier of its own, so its column is one no other spec in the
     process registered. */
  test('is reported once, with the tag to define', async () => {
    const { HelixHeadlessDataTable } = await import('../index.js')
    customElements.define(
      'spec-grid-data-table',
      class extends HelixHeadlessDataTable {
        static override tier = 'spec-grid-'
      },
    )
    const markup = `<spec-grid-data-table label="Files">
      <spec-grid-table-column field="name">Name</spec-grid-table-column>
    </spec-grid-data-table>`
    expect((await told(markup)).map((one) => one.message)).toEqual([
      '<spec-grid-table-column> in <spec-grid-data-table> is not registered, so the table draws no columns. Define <spec-grid-table-column> as you defined <spec-grid-data-table>.',
    ])
    expect(await told(markup)).toEqual([])
  })

  test('and with the import, says nothing and reads them', async () => {
    await import('../../table/index.js')
    const heard = await told(`<helix-headless-data-table label="Files">
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="size">Size</helix-headless-table-column>
    </helix-headless-data-table>`)
    expect(heard).toEqual([])
    const host = document.body.firstElementChild as HTMLElement & { tableColumns: unknown[] }
    expect(host.tableColumns).toHaveLength(2)
  })
})
