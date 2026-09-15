import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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
       column. Held apart they can disagree with nothing to report it: `columns`
       takes CSS, so a wrong value is an invalid track list, which a grid
       ignores in silence. */
    expect(template(await table())).toContain('12rem minmax(max-content, 1fr)')
  })

  test('a column with no width shares what is left', async () => {
    // The floor is `max-content`, so the column asks for its longest cell and the
    // table scrolls its own box rather than breaking the value to fit.
    expect(template(await table())).toContain('minmax(max-content, 1fr)')
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

/* Layout, so honestly absent under `bun test`, where every box is `0 0 0 0`.
   `bun run specs:browser table`. */
const geometry = hasLayout() ? test : (): void => {}

describe('a heading, where there is layout to place it', () => {
  const heading = async (attributes: string, around = ''): Promise<HTMLElement> => {
    const host = (await mount(
      `<div style="${around}"><helix-table label="Deployments">
        <helix-table-column width="10rem">Service</helix-table-column>
        <helix-table-column ${attributes} width="10rem">Count</helix-table-column>
      </helix-table></div>`,
    )) as HTMLElement
    const columns = host.querySelectorAll('helix-table-column')
    const count = columns[1] as HTMLElement & { updateComplete: Promise<unknown> }
    await count.updateComplete
    return count
  }

  const words = (node: Node): DOMRect => {
    const range = document.createRange()
    range.selectNodeContents(node)
    return range.getBoundingClientRect()
  }

  /* Where the words end against where the heading's content ends, which is its
     box less the inset on the inline end: the right in one direction and the
     left in the other. */
  const gap = (count: HTMLElement): { end: number; start: number } => {
    const column = part(count, 'column') as HTMLElement
    const box = column.getBoundingClientRect()
    const inset = Number.parseFloat(getComputedStyle(column).paddingInlineEnd)
    const text = words(count)
    return getComputedStyle(column).direction === 'rtl'
      ? { end: text.left - (box.left + inset), start: box.right - text.right }
      : { end: box.right - inset - text.right, start: text.left - box.left }
  }

  geometry('follows `align` to the edge it names, in either direction', async () => {
    expect(Math.abs(gap(await heading('')).start)).toBeLessThan(2)
    expect(Math.abs(gap(await heading('align="end"')).end)).toBeLessThan(2)
    expect(Math.abs(gap(await heading('align="end" dir="rtl"')).end)).toBeLessThan(2)
  })

  /* Data Table's hooks reach a heading by being relayed onto its columns, and
     only onto its columns: read under those names by the column itself, a page
     setting them for its data tables would restyle every other table's
     headings too. */
  geometry("keeps its own size where a page sets a data table's", async () => {
    const plain = await heading('')
    const expected = getComputedStyle(part(plain, 'column') as Element).fontSize
    const count = await heading('', '--data-table-text: 31px')
    expect(getComputedStyle(part(count, 'column') as Element).fontSize).toBe(expected)
    expect(expected).not.toBe('31px')
  })
})

describe('the cells under a column set to an edge, where there is layout to place them', () => {
  type Updating = HTMLElement & { updateComplete: Promise<boolean> }

  /* The table's render, then the watcher's turn and the render it asks for. */
  const settle = async (host: Updating): Promise<void> => {
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
  }

  const table = async (dir: 'ltr' | 'rtl', count = 'align="end"'): Promise<Updating> => {
    const host = (await mount(
      `<helix-table dir="${dir}" label="Deploys">
        <helix-table-column width="10rem">Service</helix-table-column>
        <helix-table-column ${count} width="10rem">Count</helix-table-column>
        <helix-table-row>
          <helix-table-cell header>Gateway</helix-table-cell>
          <helix-table-cell>34</helix-table-cell>
        </helix-table-row>
        <helix-table-row>
          <helix-table-cell header>Billing</helix-table-cell>
          <helix-table-cell>1800</helix-table-cell>
        </helix-table-row>
      </helix-table>`,
    )) as Updating
    await settle(host)
    return host
  }

  /* Where the words are, rather than where the boxes are: the heading and the
     cells share a track whatever either one's content does, so only the text
     says which edge it went to. */
  const words = (node: Node): DOMRect => {
    const range = document.createRange()
    range.selectNodeContents(node)
    return range.getBoundingClientRect()
  }

  /** A column's heading and every cell under it, found by the heading's words. */
  const column = (host: HTMLElement, name: string): { cells: DOMRect[]; heading: DOMRect } => {
    const headings = [...host.querySelectorAll('helix-table-column')]
    const index = headings.findIndex((one) => one.textContent?.trim() === name)
    const cells = [...host.querySelectorAll('helix-table-row')].map(
      (row) => row.children[index] as Node,
    )
    return { cells: cells.map(words), heading: words(headings[index] as Node) }
  }

  /** The largest distance between the heading's edge and a cell's. */
  const off = (
    { cells, heading }: { cells: DOMRect[]; heading: DOMRect },
    edge: 'left' | 'right',
  ): number => Math.max(...cells.map((cell) => Math.abs(cell[edge] - heading[edge])))

  geometry(
    'end where the heading ends, and a column left alone starts with its heading',
    async () => {
      const host = await table('ltr')
      expect(off(column(host, 'Count'), 'right')).toBeLessThan(2)
      expect(off(column(host, 'Service'), 'left')).toBeLessThan(2)
      /* And it is the edge that moved them: two values of different lengths
       starting at one place would pass the start as easily. */
      const [short, long] = column(host, 'Count').cells as [DOMRect, DOMRect]
      expect(long.left).toBeLessThan(short.left - 4)
    },
  )

  /* The end is the inline end. The cell's inset was physical, so in this
     direction it sat on the wrong side of every value, the heading's on the
     right one, and the two edges disagreed by the inset. */
  geometry('end at the left in a right-to-left table, where the heading ends', async () => {
    const host = await table('rtl')
    expect(off(column(host, 'Count'), 'left')).toBeLessThan(2)
    expect(off(column(host, 'Service'), 'right')).toBeLessThan(2)
    expect(column(host, 'Count').heading.left).toBeLessThan(column(host, 'Service').heading.left)
  })

  /* Set from script, which is how React sets it: the table reads the edge in
     its own render, and the column asks for one. */
  geometry('follow an edge the column is given after the table drew', async () => {
    const host = await table('ltr', '')
    const count = host.querySelectorAll('helix-table-column')[1] as Updating & { align?: string }
    count.align = 'end'
    await count.updateComplete
    await settle(host)
    expect(off(column(host, 'Count'), 'right')).toBeLessThan(2)
  })

  /* A consumer reordering columns moves the heading and the cell in every row.
     The edge goes with the column rather than staying with the position. */
  geometry('go with their column when it moves', async () => {
    const host = await table('ltr')
    const [service, count] = [...host.querySelectorAll('helix-table-column')] as Element[]
    host.insertBefore(count as Element, service as Element)
    for (const row of host.querySelectorAll('helix-table-row')) {
      row.insertBefore(row.children[1] as Element, row.children[0] as Element)
    }
    await settle(host)
    expect(off(column(host, 'Count'), 'right')).toBeLessThan(2)
    expect(off(column(host, 'Service'), 'left')).toBeLessThan(2)
    expect(column(host, 'Count').heading.right).toBeLessThan(column(host, 'Service').heading.left)
  })

  /* The cells are the consumer's markup, and the edge reaches them through a
     rule in each row's shadow root rather than through anything written on
     them. */
  test('writes nothing onto a cell', async () => {
    const host = await table('ltr')
    for (const cell of host.querySelectorAll('helix-table-cell')) {
      expect(cell.getAttributeNames()).toEqual(cell.hasAttribute('header') ? ['header'] : [])
    }
  })
})
