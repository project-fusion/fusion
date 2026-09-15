import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/**
 * The styled tier, which is paint over the headless behavior.
 *
 * The ordering, the events and the controlled contract are the headless tier's
 * and are asserted there; repeating them here would be one suite testing another
 * suite's subject. What is left is the pair of claims the styled tier makes for
 * itself: that a `helix-data-table` is still a grid after the subclass, and that
 * it renders through the *styled* pagination rather than the headless one.
 *
 * That second one is the reason `tier` exists: a template naming a literal tag renders the wrong tier's
 * element, and the wrong tier's element is unstyled rather than absent, so
 * nothing throws and the table just looks broken in one corner.
 */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const markup = `
  <helix-data-table label="Objects" page-size="2">
    <helix-table-column field="name" sortable>Name</helix-table-column>
    <helix-table-column field="size" align="end">Size</helix-table-column>
  </helix-data-table>`

const table = async () => {
  const element = (await mount(markup)) as HTMLElement & {
    rows: readonly Record<string, unknown>[]
    updateComplete: Promise<unknown>
  }
  element.rows = [
    { name: 'alpha', size: 30 },
    { name: 'bravo', size: 4 },
    { name: 'charlie', size: 1000 },
  ]
  await element.updateComplete
  return element
}

describe('the styled data table', () => {
  test('it is still a grid, and the roles survive the subclass', async () => {
    const element = await table()
    expect(role(element)).toBe('grid')
    expect(part(element, 'table')?.getAttribute('role')).toBe('rowgroup')
    expect(part(element, 'head')?.getAttribute('role')).toBe('row')
  })

  test('the columns a consumer declares are the styled ones', async () => {
    const element = await table()
    expect(element.querySelectorAll('helix-table-column')).toHaveLength(2)
    expect(part(element, 'cell')?.textContent?.trim()).toBe('alpha')
  })

  /**
   * `tier` is `helix-` on this class, so the interpolated tag is the styled
   * pagination. Rendered as `helix-headless-pagination` it would be an unstyled
   * control in the footer of a styled table, and nothing would throw.
   */
  test('the pagination it composes is the styled one', async () => {
    const element = await table()
    const pagination = part(element, 'pagination')
    expect(pagination).not.toBeNull()
    expect(pagination?.localName).toBe('helix-pagination')
  })

  test('the cells span every column when there is nothing to show', async () => {
    const element = (await mount(markup)) as HTMLElement & {
      rows: readonly Record<string, unknown>[]
      updateComplete: Promise<unknown>
    }
    element.rows = []
    await element.updateComplete
    expect(part(element, 'empty')).not.toBeNull()
  })
})

/* Guarded, so these are honestly *absent* under `bun test` rather than passing
   without checking anything. Every claim below is about a box, and happy-dom has
   none: it reports zero for `clientHeight`, which makes a window of eight rows
   and a window of five thousand indistinguishable. Run them with
   `bun run specs:browser data-table`. */
const geometry = hasLayout() ? test : (): void => {}

describe('a windowed table, where there is layout to window', () => {
  const windowedMarkup = `
    <helix-data-table label="Assets" windowed>
      <helix-table-column field="name" sortable width="14rem">File</helix-table-column>
      <helix-table-column field="size" align="end">Size</helix-table-column>
    </helix-data-table>`

  /* Several cycles rather than one. A measured placement reads the rows it just
     drew and may move the window once more because of what it read, which is a
     second update the first `updateComplete` cannot have waited for. */
  const settle = async (element: { updateComplete: Promise<unknown> }): Promise<void> => {
    for (let pass = 0; pass < 4; pass++) {
      await element.updateComplete
    }
  }

  const windowed = async () => {
    const element = (await mount(windowedMarkup)) as HTMLElement & {
      rows: readonly Record<string, unknown>[]
      sort: string
      updateComplete: Promise<unknown>
    }
    element.rows = Array.from({ length: 5000 }, (_, index) => ({
      name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
      size: 12_000 + index * 137,
    }))
    await settle(element)
    return element
  }

  const first = (element: HTMLElement) =>
    element.shadowRoot?.querySelector('[part="row"]') as HTMLElement | null

  geometry('scrolls the whole result while drawing a window of it', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    const drawn = element.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0

    expect(drawn).toBeGreaterThan(0)
    expect(drawn).toBeLessThan(100)
    /* The spacers carry the rows that were not drawn, so the scrollbar measures
       five thousand of them rather than the twenty on screen. Sized to the
       window instead, the thumb fills the track and dragging it means nothing. */
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight * 20)
  })

  geometry('draws other rows once scrolled, and the index follows the content', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    const before = first(element)?.textContent?.trim()

    box.scrollTop = Math.floor(box.scrollHeight / 2)
    box.dispatchEvent(new Event('scroll'))
    await settle(element)

    const row = first(element)
    expect(row?.textContent?.trim()).not.toBe(before)
    /* Each name carries its own number, so the index and the content are checked
       against each other rather than each against itself: row `n` of the result
       is `aria-rowindex` n + 2 counting the head, and is named n + 1. An index
       that drifts from the row it labels is what this is here to catch. */
    const at = Number(row?.getAttribute('aria-rowindex'))
    expect(at).toBeGreaterThan(2)
    expect(row?.textContent).toContain(String(at - 1).padStart(4, '0'))
  })

  geometry('re-sorting a scrolled window leaves the rows where it says they are', async () => {
    /* Heights are recorded against a position in the drawn set, so a sort makes
       every one of them a measurement of a row that has moved. Kept, the window
       places rows by what its neighbors used to be; forgotten, it falls back to
       the estimate and re-measures. Either way it self-heals within a frame or
       two -- what this asserts is that it lands somewhere honest, with the row's
       own number matching the index the grid gives it. */
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement

    box.scrollTop = Math.floor(box.scrollHeight / 3)
    box.dispatchEvent(new Event('scroll'))
    await settle(element)

    /* `name:desc` and not `size:asc`: `size` ascends with the index in this
       fixture, so sorting by it returns the order the rows already had and the
       spec would assert nothing. Descending name genuinely moves every row. */
    element.sort = 'name:desc'
    await settle(element)

    const row = first(element)
    const at = Number(row?.getAttribute('aria-rowindex'))
    expect(at).toBeGreaterThan(2)
    // Row n of a reversed set is asset 5000 - n, and n is `aria-rowindex` - 2.
    expect(row?.textContent).toContain(String(5002 - at).padStart(4, '0'))
  })

  geometry('holds the headings in place while the rows pass under them', async () => {
    const element = await windowed()
    const box = part(element, 'table') as HTMLElement
    /* The heading's own box, and not the column element. The column is
       `display: contents` and measures `0 0 0 0` wherever its heading is, so a
       spec reading it passed on a page mounted at the top while every heading
       scrolled off: measured, the column element at 0 and its heading at -301. */
    const head = part(element.querySelector('helix-table-column') as HTMLElement, 'column')
    const offset = () =>
      (head as HTMLElement).getBoundingClientRect().top - box.getBoundingClientRect().top

    expect(Math.abs(offset())).toBeLessThan(2)

    box.scrollTop = 2_000
    box.dispatchEvent(new Event('scroll'))
    await settle(element)
    /* `position: sticky` on the heading's box inside each column, relayed from
       this table's sheet. Written on `[part="head"]` or on the column element,
       both `display: contents`, this reads about -2000, with the headings
       scrolled off the top of their own box. */
    expect(Math.abs(offset())).toBeLessThan(2)
  })
})

describe('a heading, where there is layout to place it', () => {
  const mountIn = async (dir: 'ltr' | 'rtl', style = '') => {
    const element = (await mount(`
      <helix-data-table dir="${dir}" label="Objects" style="${style}">
        <helix-table-column field="name" width="12rem">Name</helix-table-column>
        <helix-table-column field="size" align="end" width="8rem">Size</helix-table-column>
      </helix-data-table>`)) as HTMLElement & {
      rows: readonly Record<string, unknown>[]
      updateComplete: Promise<unknown>
    }
    element.rows = [{ name: 'alpha', size: 30 }]
    await element.updateComplete
    return element
  }

  /* Where the words are, rather than where the boxes are: the heading and the
     cell are the same width whatever either one's content does, so only the
     text says which edge it went to. */
  const words = (node: Node): DOMRect => {
    const range = document.createRange()
    range.selectNodeContents(node)
    return range.getBoundingClientRect()
  }

  const measure = (element: HTMLElement) => {
    const [name, size] = [...element.querySelectorAll('helix-table-column')] as HTMLElement[]
    const cells = [...(element.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])]
    return {
      name: { cell: words(cells[0] as Node), heading: words(name as Node) },
      size: { cell: words(cells[1] as Node), heading: words(size as Node) },
    }
  }

  geometry('a column set to the end ends its heading where its values end', async () => {
    const { name, size } = measure(await mountIn('ltr'))
    expect(Math.abs(size.heading.right - size.cell.right)).toBeLessThan(2)
    /* And a column left alone stays at the start, over its own values. */
    expect(Math.abs(name.heading.left - name.cell.left)).toBeLessThan(2)
  })

  geometry('the end is the left edge in a right-to-left table', async () => {
    const { name, size } = measure(await mountIn('rtl'))
    expect(Math.abs(size.heading.left - size.cell.left)).toBeLessThan(2)
    expect(size.heading.left).toBeLessThan(name.heading.left)
    expect(Math.abs(name.heading.right - name.cell.right)).toBeLessThan(2)
  })

  /* The hooks were written on the column element, which is `display: contents`
     and draws its heading one shadow root further in, so none of them reached
     it: a heading color that changed nothing and an inset that left the
     headings where they were while every cell moved. */
  geometry('the documented hooks reach the headings as well as the cells', async () => {
    const element = await mountIn(
      'ltr',
      '--data-table-heading-color: rgb(1, 2, 3); --data-table-text: 20px; ' +
        '--data-table-padding-inline: 5px; --data-table-rule-color: rgb(4, 5, 6)',
    )
    const heading = part(element.querySelector('helix-table-column') as HTMLElement, 'column')
    const style = getComputedStyle(heading as Element)
    expect(style.color).toBe('rgb(1, 2, 3)')
    expect(style.fontSize).toBe('20px')
    expect(style.paddingInlineStart).toBe('5px')
    expect(style.borderBlockEndColor).toBe('rgb(4, 5, 6)')
    const { name } = measure(element)
    expect(Math.abs(name.heading.left - name.cell.left)).toBeLessThan(2)
  })
})
