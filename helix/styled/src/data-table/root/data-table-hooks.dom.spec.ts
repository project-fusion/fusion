import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the tree mark's and the load-more row's hooks change, which only a
   browser computes. Run them with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Table = HTMLElement & Updatable & { rows: readonly Record<string, unknown>[] }

const table = async (style = ''): Promise<Table> => {
  const host =
    (await mount(`<helix-data-table label="Files" child-field="children" row-key="name" load-more style="${style}">
    <helix-table-column field="name">Name</helix-table-column>
  </helix-data-table>`)) as Table
  host.rows = [{ children: [{ name: 'a.ts' }], name: 'src' }, { name: 'README.md' }]
  await settle(host)
  return host
}

describe('data table hooks', () => {
  geometry('the tree mark keeps its size and color, and the hooks change them', async () => {
    const mark = (host: HTMLElement) =>
      host.shadowRoot?.querySelector('[part~="toggle"]') as HTMLElement
    const plain = await table()
    expect(getComputedStyle(mark(plain)).inlineSize).toBe('16px')
    const hooked = await table(
      '--data-table-toggle-size: 20px; --data-table-toggle-color: rgb(1, 2, 3)',
    )
    expect(getComputedStyle(mark(hooked)).inlineSize).toBe('20px')
    expect(getComputedStyle(mark(hooked)).color).toBe('rgb(1, 2, 3)')
  })

  geometry('the load-more button takes its edge and corner from the hooks', async () => {
    const hooked = await table(
      '--data-table-more-border-color: rgb(4, 5, 6); --data-table-more-radius: 9px',
    )
    const button = hooked.shadowRoot?.querySelector('[part="more-button"]') as HTMLElement
    expect(getComputedStyle(button).borderTopColor).toBe('rgb(4, 5, 6)')
    expect(getComputedStyle(button).borderTopLeftRadius).toBe('9px')
  })
})
