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

  geometry(
    'the load-more button, the mark and the footer take their spacing from the hooks',
    async () => {
      const plain = await table()
      const more = (host: HTMLElement) =>
        host.shadowRoot?.querySelector('[part="more-button"]') as HTMLElement
      const mark = (host: HTMLElement) =>
        host.shadowRoot?.querySelector('[part~="toggle"]') as HTMLElement
      expect(getComputedStyle(more(plain)).paddingInlineStart).toBe('12px')
      expect(getComputedStyle(mark(plain)).marginInlineEnd).toBe('4px')
      const hooked = await table(
        '--data-table-more-padding-inline: 3px; --data-table-more-padding-block: 2px; --data-table-toggle-gap: 6px; --data-table-footer-gap: 7px; --data-table-toolbar-gap: 8px',
      )
      expect(getComputedStyle(more(hooked)).paddingInlineStart).toBe('3px')
      expect(getComputedStyle(more(hooked)).paddingBlockStart).toBe('2px')
      expect(getComputedStyle(mark(hooked)).marginInlineEnd).toBe('6px')
      const footer = hooked.shadowRoot?.querySelector('[part="footer"]') as HTMLElement
      expect(getComputedStyle(footer).paddingBlockStart).toBe('7px')
      const toolbar = hooked.shadowRoot?.querySelector('[part="toolbar"]') as HTMLElement
      expect(getComputedStyle(toolbar).paddingBlockEnd).toBe('8px')
    },
  )

  geometry('a selected row takes its fill from the hook', async () => {
    const host =
      (await mount(`<helix-data-table label="Files" row-key="name" selectable default-selected="a" style="--data-table-selected-background-color: rgb(7, 8, 9)">
      <helix-table-column field="name">Name</helix-table-column>
    </helix-data-table>`)) as Table
    host.rows = [{ name: 'a' }, { name: 'b' }]
    await settle(host)
    const cells = [...(host.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])] as HTMLElement[]
    expect(cells.map((cell) => getComputedStyle(cell).backgroundColor)).toEqual([
      'rgb(7, 8, 9)',
      'rgba(0, 0, 0, 0)',
    ])
  })
})
