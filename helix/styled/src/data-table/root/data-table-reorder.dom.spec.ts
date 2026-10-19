import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* How rows moved by a grip are drawn, with `reorderable-rows`. Which order is
   asked for is the headless tier's claim and is asserted there. The geometry
   cases need a browser: run them with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Table = HTMLElement & Updatable & { rows: readonly Record<string, unknown>[] }

/* The sheet the table adopts, as text: happy-dom resolves no cascade, so here
   is held that a rule exists, and the browser cases that it applies. */
const sheet = (): string => {
  const declared = (customElements.get('helix-data-table') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const table = async (style = ''): Promise<Table> => {
  const host =
    (await mount(`<helix-data-table label="Files" row-key="id" reorderable-rows style="${style}">
    <helix-table-column field="name">Name</helix-table-column>
  </helix-data-table>`)) as Table
  host.rows = [
    { id: 'a', name: 'alpha' },
    { id: 'b', name: 'bravo' },
  ]
  await settle(host)
  return host
}

const inner = (host: HTMLElement, selector: string): HTMLElement =>
  host.shadowRoot?.querySelector(selector) as HTMLElement

describe('a data table with reorderable-rows', () => {
  test('keeps a row that is moving a row of the one grid', () => {
    /* A row carries `row-dragging` or `row-drop-*` beside `row` while a move
       runs, and an exact `[part="row"]` would give it a box of its own. */
    expect(rule('[part="head"], [part~="row"]')).toContain('display: contents')
    expect(sheet()).not.toMatch(/\[part="row"\]/)
  })

  test('draws the grip quiet and grabbable, and still while a sort decides', () => {
    const grip = rule('[part="row-grip-button"]')
    expect(grip.trim().startsWith('all: unset')).toBe(true)
    expect(grip).toContain('var(--data-table-grip-color, var(--helix-color-foreground-muted))')
    expect(grip).toContain('cursor: grab')
    expect(grip).toContain('touch-action: none')
    expect(rule('[part="row-grip-button"][aria-disabled="true"]')).toContain(
      'opacity: var(--data-table-grip-disabled-opacity, 0.4)',
    )
  })

  test('fades the row being moved and draws a line where it lands, through the family hooks', () => {
    expect(rule('[part~="row"][part~="row-dragging"] > *')).toContain(
      'opacity: var(--data-table-dragging-opacity, 0.5)',
    )
    expect(rule('[part~="row"][part~="row-drop-before"] > *')).toContain(
      'var(--data-table-drop-indicator-color, var(--helix-color-primary))',
    )
    expect(rule('[part~="row"][part~="row-drop-after"] > *')).toContain('* -1)')
  })

  test('draws a grip in each row of the styled tier', async () => {
    const host = await table()
    expect(host.shadowRoot?.querySelectorAll('[part="row-grip"]')).toHaveLength(2)
    host.remove()
  })

  geometry('puts the grips in a column that takes what it needs, ahead of the rest', async () => {
    const host = await table()
    const grip = inner(host, '[part="row-grip"]').getBoundingClientRect()
    const cell = inner(host, '[part~="cell"]').getBoundingClientRect()
    expect(grip.right).toBeLessThanOrEqual(cell.left + 0.5)
    expect(grip.width).toBeLessThan(64)
    expect(getComputedStyle(inner(host, '[part~="row"]')).display).toBe('contents')
    host.remove()
  })

  geometry('the hooks change the grip and the line', async () => {
    const host = await table(
      '--data-table-grip-color: rgb(1, 2, 3); --data-table-drop-indicator-color: rgb(4, 5, 6)',
    )
    expect(getComputedStyle(inner(host, '[part="row-grip-button"]')).color).toBe('rgb(1, 2, 3)')
    const row = inner(host, '[part~="row"]')
    row.setAttribute('part', 'row row-drop-before')
    expect(getComputedStyle(row.firstElementChild as Element).boxShadow).toContain('rgb(4, 5, 6)')
    host.remove()
  })
})

describe('the drag preview of a reorderable data table', () => {
  /* The copy a pointer drags is drawn in the data table's own shadow root, so its
     sheet gives it its look. Nothing in it is animated, so it follows the
     pointer the same way whatever the reader's motion setting. */
  test('raises the copy over the page through the family hooks', () => {
    /* Read with the line breaks a formatter puts in a long `var()` taken out. */
    const preview = (sheet().split('[part="drag-preview"] {')[1]?.split('}')[0] ?? '')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
    expect(preview).toContain(
      'background-color: var(--data-table-drag-preview-background-color, var(--helix-color-surface-raised))',
    )
    expect(preview).toContain(
      'border: var(--data-table-drag-preview-border-width, var(--helix-border-floating)) solid',
    )
    expect(preview).toContain(
      'border-radius: var(--data-table-drag-preview-radius, var(--helix-radii-sm))',
    )
    expect(preview).toContain(
      'box-shadow: var(--data-table-drag-preview-shadow, var(--helix-shadow-floating))',
    )
    expect(preview).toContain('opacity: var(--data-table-drag-preview-opacity, 0.9)')
    expect(preview).not.toContain('transition')
  })
})
