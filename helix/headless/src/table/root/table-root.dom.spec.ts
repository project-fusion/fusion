import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom hands a manual slot the children it gained with no
   `assign` asking, so the two specs below passed there with the watcher
   removed. In Chromium both fail without it. */
const browser = hasLayout() ? test : (): void => {}

type Updating = HTMLElement & { updateComplete: Promise<boolean> }

/* An update, and then the observer's turn: a mutation record is delivered
   as a microtask after the change, and the render it asks for after that. */
const settle = async (host: Updating): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await host.updateComplete
}

const markup = `
  <helix-headless-table label="Deployments">
    <helix-headless-table-column>Service</helix-headless-table-column>
    <helix-headless-table-column width="10rem">Count</helix-headless-table-column>
    <helix-headless-table-row>
      <helix-headless-table-cell>helix-web</helix-headless-table-cell>
      <helix-headless-table-cell>34</helix-headless-table-cell>
    </helix-headless-table-row>
  </helix-headless-table>`

const template = (host: HTMLElement): string =>
  (part(host, 'table') as HTMLElement).getAttribute('style') ?? ''

/**
 * What reaches a table after it drew.
 *
 * **Its slots are assigned by hand, so nothing arrives on its own.** A child
 * appended or moved after the first render changes no assignment unless the
 * table makes it, and a column's width is read in the table's render, not the
 * column's.
 */
describe('a table told about what changed after it drew', () => {
  browser('draws a row appended later', async () => {
    const host = (await mount(markup)) as Updating
    await settle(host)
    const row = document.createElement('helix-headless-table-row')
    row.innerHTML = '<helix-headless-table-cell>cortex-core</helix-headless-table-cell>'
    host.append(row)
    await settle(host)
    expect(slotted(host)).toContain(row)
  })

  browser('keeps a column that moved, in its new place', async () => {
    const host = (await mount(markup)) as Updating
    await settle(host)
    const [service, count] = [...host.querySelectorAll('helix-headless-table-column')]
    host.insertBefore(count as Element, service as Element)
    await settle(host)
    expect(slotted(host, 'columns')).toEqual([count as Element, service as Element])
    expect(template(host)).toContain('10rem minmax(max-content, 1fr)')
  })

  test('takes a width a column is given later', async () => {
    /* What a resize writes, so a separator that moved and a track that did not
       is this spec failing. */
    const host = (await mount(markup)) as Updating
    await settle(host)
    const count = host.querySelectorAll('helix-headless-table-column')[1] as Updating & {
      width: string
    }
    count.width = '12rem'
    await count.updateComplete
    await settle(host)
    expect(template(host)).toContain('minmax(max-content, 1fr) 12rem')
  })
})

/**
 * A column's edge, handed to the cells under it.
 *
 * **Published and not drawn**, which is this tier's side of it: each cell
 * carries its column's `text-align` as `--table-cell-align`, and what lining up
 * means is the sheet's that draws the cell. Browser only, since it arrives
 * through a `::slotted()` rule and happy-dom computes no custom property from
 * one.
 */
describe("a table publishing each column's edge to its cells", () => {
  const edge = (cell: Element | undefined): string =>
    getComputedStyle(cell as Element)
      .getPropertyValue('--table-cell-align')
      .trim()

  const aligned = async (inner = ''): Promise<Updating> => {
    const host = (await mount(`
      <helix-headless-table label="Deployments">
        <helix-headless-table-column>Service</helix-headless-table-column>
        <helix-headless-table-column text-align="end">Count</helix-headless-table-column>
        <helix-headless-table-row>
          <helix-headless-table-cell>helix-web</helix-headless-table-cell>
          <helix-headless-table-cell>34${inner}</helix-headless-table-cell>
        </helix-headless-table-row>
      </helix-headless-table>`)) as Updating
    await settle(host)
    return host
  }

  browser('to the cells under a column set to one, and to no others', async () => {
    const cells = [...(await aligned()).querySelectorAll('helix-headless-table-cell')]
    expect(edge(cells[0])).toBe('')
    expect(edge(cells[1])).toBe('end')
  })

  /* A column hidden with its cells keeps its place in both counts, so the
     cells after it keep their own column's edge rather than taking the next
     one's. */
  browser('to the same cells when a column before them is hidden with its own', async () => {
    const host = await aligned()
    ;(host.querySelector('helix-headless-table-column') as HTMLElement).hidden = true
    const cells = [...host.querySelectorAll('helix-headless-table-cell')] as HTMLElement[]
    ;(cells[0] as HTMLElement).hidden = true
    await settle(host)
    expect(edge(cells[1])).toBe('end')
  })

  /* A custom property inherits, so a table inside an aligned cell would take
     the outer column's edge for every column of its own that sets none. */
  browser("and not to a table nested in an aligned cell's own cells", async () => {
    const host = await aligned(`
      <helix-headless-table label="Inner">
        <helix-headless-table-column>Zone</helix-headless-table-column>
        <helix-headless-table-row>
          <helix-headless-table-cell id="inner">a</helix-headless-table-cell>
        </helix-headless-table-row>
      </helix-headless-table>`)
    await settle(host.querySelector('[label="Inner"]') as Updating)
    expect(edge(host.querySelector('#inner') ?? undefined)).toBe('')
  })

  /* The attribute is a string anybody can write, and it lands in a stylesheet. */
  browser('only as one of the three edges', async () => {
    const host = await aligned()
    const count = host.querySelectorAll('helix-headless-table-column')[1] as Updating & {
      textAlign?: string
    }
    count.setAttribute('text-align', 'end; } ::slotted(*) { display: none')
    await count.updateComplete
    await settle(host)
    const cells = [...host.querySelectorAll('helix-headless-table-cell')]
    expect(edge(cells[1])).toBe('')
    expect(getComputedStyle(cells[1] as Element).display).not.toBe('none')
  })
})

/**
 * The tracks, from the columns and the table's `columns`.
 *
 * **Each column takes the track in its place in the list, unless it sets a
 * `width`.** A width is written on the column it sizes, and it is where a
 * resize lands, so were the list to win a reader's drag would move nothing.
 */
describe('a table whose columns are sized by its `columns`', () => {
  const sized = async (list: string, columns: string): Promise<string> => {
    const host = (await mount(
      `<helix-headless-table columns="${list}" label="Deploys">${columns}</helix-headless-table>`,
    )) as Updating
    await settle(host)
    return template(host)
  }

  const three = `
    <helix-headless-table-column>Service</helix-headless-table-column>
    <helix-headless-table-column>Last change</helix-headless-table-column>
    <helix-headless-table-column>Count</helix-headless-table-column>`

  test('gives each column the track in its place', async () => {
    expect(await sized('14rem 1fr 6rem', three)).toBe('--table-template: 14rem 1fr 6rem')
  })

  test("and a column's own width wins over it", async () => {
    expect(
      await sized(
        '14rem 1fr 6rem',
        `<helix-headless-table-column>Service</helix-headless-table-column>
         <helix-headless-table-column width="20rem">Last change</helix-headless-table-column>
         <helix-headless-table-column>Count</helix-headless-table-column>`,
      ),
    ).toBe('--table-template: 14rem 20rem 6rem')
  })

  /* The columns say how many tracks there are, and the list only how wide. */
  test('leaves a column past the list its default, and drops a track past the columns', async () => {
    const two = `
      <helix-headless-table-column>Service</helix-headless-table-column>
      <helix-headless-table-column>Count</helix-headless-table-column>`
    expect(await sized('14rem', two)).toBe('--table-template: 14rem minmax(max-content, 1fr)')
    expect(await sized('1px 2px 3px', two)).toBe('--table-template: 1px 2px')
  })

  test('counts the tracks the way the grid does', async () => {
    expect(await sized('[start] minmax(0, 1fr) repeat(2, 8rem)', three)).toBe(
      '--table-template: [start] minmax(0, 1fr) 8rem 8rem',
    )
    /* An automatic repeat names no count to hand out, so it hands out none. */
    expect(await sized('repeat(auto-fill, 8rem) 6rem', three)).toBe(
      '--table-template: 6rem minmax(max-content, 1fr) minmax(max-content, 1fr)',
    )
  })

  /* One invalid track makes the whole list invalid, which a grid drops in
     silence and draws as one column. Browser only: happy-dom's `CSS.supports`
     answers yes to everything. */
  browser('leaves a column at its default where its track is one the grid refuses', async () => {
    expect(await sized('Service 1fr 6rem', three)).toBe(
      '--table-template: minmax(max-content, 1fr) 1fr 6rem',
    )
  })
})

/**
 * A hidden column, which takes no track.
 *
 * Left in, the header row had a heading fewer than the grid had tracks, the
 * first cell filled the gap, and every row after it began a column late.
 */
describe('a table with a column hidden', () => {
  const hiding = (attributes = ''): string => `
    <helix-headless-table label="Deploys" ${attributes}>
      <helix-headless-table-column hidden width="12rem">Service</helix-headless-table-column>
      <helix-headless-table-column>Region</helix-headless-table-column>
      <helix-headless-table-column width="6rem">Count</helix-headless-table-column>
      <helix-headless-table-row>
        <helix-headless-table-cell hidden>helix-web</helix-headless-table-cell>
        <helix-headless-table-cell>us-east-1</helix-headless-table-cell>
        <helix-headless-table-cell>34</helix-headless-table-cell>
      </helix-headless-table-row>
      <helix-headless-table-row>
        <helix-headless-table-cell hidden>cortex-core</helix-headless-table-cell>
        <helix-headless-table-cell>eu-west-2</helix-headless-table-cell>
        <helix-headless-table-cell>1800</helix-headless-table-cell>
      </helix-headless-table-row>
    </helix-headless-table>`

  test('lays out no track for it', async () => {
    const host = (await mount(hiding())) as Updating
    await settle(host)
    expect(template(host)).toBe('--table-template: minmax(max-content, 1fr) 6rem')
  })

  /* `hidden` is the platform's attribute and no property of the column's, so
     nothing but the column watching it tells the table. */
  test('takes the track back when the column is shown, and gives it up again', async () => {
    const host = (await mount(hiding())) as Updating
    await settle(host)
    const service = host.querySelector('helix-headless-table-column') as HTMLElement
    service.hidden = false
    await settle(host)
    expect(template(host)).toBe('--table-template: 12rem minmax(max-content, 1fr) 6rem')
    service.hidden = true
    await settle(host)
    expect(template(host)).toBe('--table-template: minmax(max-content, 1fr) 6rem')
  })

  test('takes its track in `columns` with it, and the rest keep theirs', async () => {
    const host = (await mount(
      hiding('columns="14rem 1fr 3rem"').replace(' width="12rem"', ''),
    )) as Updating
    await settle(host)
    expect(template(host)).toBe('--table-template: 1fr 6rem')
  })

  /* The heading stays drawn under `until-found`, as every Helix host does, so
     the track stays with it. */
  test('keeps it under `hidden="until-found"`', async () => {
    const host = (await mount(
      hiding().replace('hidden width', 'hidden="until-found" width'),
    )) as Updating
    await settle(host)
    expect(template(host)).toBe('--table-template: 12rem minmax(max-content, 1fr) 6rem')
  })

  /* What a headless consumer writes, and no more than the layout needs: the
     grid from the published track list, and no box for the head, a row or a
     column. A hidden one is left to the UA's `[hidden]`, which an author
     `display` would beat. */
  const sheet = `<style>
    helix-headless-table::part(table) {
      display: grid;
      grid-template-columns: var(--table-template);
    }
    helix-headless-table::part(head),
    helix-headless-table-column:not([hidden]),
    helix-headless-table-row:not([hidden]) {
      display: contents;
    }
    helix-headless-table-cell:not([hidden]) {
      display: block;
    }
  </style>`

  /** The farthest any drawn cell sits from the edges of its column's heading. */
  const misplaced = (host: HTMLElement): number => {
    const headings = [...host.querySelectorAll('helix-headless-table-column')] as HTMLElement[]
    let worst = 0
    headings.forEach((column, index) => {
      if (column.hidden) {
        return
      }
      const heading = (part(column, 'column') as Element).getBoundingClientRect()
      for (const row of host.querySelectorAll('helix-headless-table-row')) {
        const cell = (row.children[index] as Element).getBoundingClientRect()
        worst = Math.max(
          worst,
          Math.abs(cell.left - heading.left),
          Math.abs(cell.right - heading.right),
        )
      }
    })
    return worst
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    browser(`puts every cell after it under its own heading, ${dir}`, async () => {
      const host = (await mount(hiding(`dir="${dir}"`) + sheet)) as Updating
      await settle(host)
      expect(misplaced(host)).toBeLessThan(1)
      /* The hidden column's twelve rems went with it, rather than to Region. */
      const count = host.querySelectorAll('helix-headless-table-column')[2] as HTMLElement
      expect(Math.round((part(count, 'column') as Element).getBoundingClientRect().width)).toBe(96)
    })
  }
})
