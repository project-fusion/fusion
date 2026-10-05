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
 * The columns that set no width, fitted to what they hold.
 *
 * **A column of sentences wraps and a column of values does not.** Left at
 * `minmax(max-content, 1fr)`, a description asks for its longest sentence on
 * one line and the table scrolls to give it. A value must never wrap, so a
 * hyphen in `eu-central-1` is no place to break it.
 */
describe('a table fitting the columns that set nothing', () => {
  const sentence = 'The color every surface is painted over, and the page behind it.'

  const fitted = async (columns: string, rows: string[][], list = ''): Promise<string> => {
    const body = rows
      .map(
        (cells) =>
          `<helix-headless-table-row>${cells
            .map((cell) => `<helix-headless-table-cell>${cell}</helix-headless-table-cell>`)
            .join('')}</helix-headless-table-row>`,
      )
      .join('')
    const host = (await mount(
      `<helix-headless-table columns="${list}" label="Tokens">${columns}${body}</helix-headless-table>`,
    )) as Updating
    await settle(host)
    return template(host)
  }

  const two = `
    <helix-headless-table-column>Token</helix-headless-table-column>
    <helix-headless-table-column>Description</helix-headless-table-column>`

  test('keeps a column of values whole and lets the column of sentences wrap', async () => {
    expect(await fitted(two, [['--helix-color-background', sentence]])).toBe(
      '--table-template: max-content minmax(14ch, 1fr)',
    )
  })

  test('shares the room between columns of sentences by how much each says', async () => {
    /* Forty characters and eighty, so the second asks for twice the first. */
    const forty = 'The color text is drawn in, on a page.'.padEnd(40, '.')
    const eighty = `${forty}${forty}`
    const three = `${two}<helix-headless-table-column>Notes</helix-headless-table-column>`
    expect(await fitted(three, [['--helix-color-background', forty, eighty]])).toBe(
      '--table-template: max-content minmax(14ch, 1fr) minmax(14ch, 2fr)',
    )
  })

  test('keeps the default in a table of values alone', async () => {
    expect(await fitted(two, [['helix-web', 'eu-central-1']])).toBe(
      '--table-template: minmax(max-content, 1fr) minmax(max-content, 1fr)',
    )
  })

  test("leaves a column's width and a track in `columns` as they were set", async () => {
    const sized = `
      <helix-headless-table-column width="12rem">Token</helix-headless-table-column>
      <helix-headless-table-column>Description</helix-headless-table-column>`
    expect(await fitted(sized, [['--helix-color-background', sentence]])).toBe(
      '--table-template: 12rem minmax(14ch, 1fr)',
    )
    expect(await fitted(two, [['--helix-color-background', sentence]], 'auto')).toBe(
      '--table-template: auto minmax(14ch, 1fr)',
    )
  })

  test('refits when the text in a cell changes', async () => {
    const host = (await mount(
      `<helix-headless-table label="Tokens">${two}
        <helix-headless-table-row>
          <helix-headless-table-cell>helix-web</helix-headless-table-cell>
          <helix-headless-table-cell>eu-central-1</helix-headless-table-cell>
        </helix-headless-table-row>
      </helix-headless-table>`,
    )) as Updating
    await settle(host)
    const cell = host.querySelectorAll('helix-headless-table-cell')[1] as Element
    ;(cell.firstChild as Text).data = sentence
    await settle(host)
    expect(template(host)).toBe('--table-template: max-content minmax(14ch, 1fr)')
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

const sortable = `
  <helix-headless-table label="Services">
    <helix-headless-table-column>Service</helix-headless-table-column>
    <helix-headless-table-column sortable field="count">Count</helix-headless-table-column>
    <helix-headless-table-row id="web">
      <helix-headless-table-cell header>web-app</helix-headless-table-cell>
      <helix-headless-table-cell>1,204</helix-headless-table-cell>
    </helix-headless-table-row>
    <helix-headless-table-row id="billing">
      <helix-headless-table-cell header>billing-api</helix-headless-table-cell>
      <helix-headless-table-cell>980</helix-headless-table-cell>
    </helix-headless-table-row>
  </helix-headless-table>`

type Sorting = Updating & { sort: string }

const drawn = (host: HTMLElement): string[] => slotted(host).map((row) => row.id)

/**
 * A sortable column in a table of markup.
 *
 * **The button it draws has to do something.** It announced a sortable column
 * and changed nothing, because only `DataTable` listened for it. The table
 * draws the rows in the new order by assigning them, and the markup stays as
 * it was written.
 */
describe('a table sorted by a column', () => {
  const press = (host: HTMLElement): void => {
    const column = host.querySelector('[field="count"]') as HTMLElement
    ;(part(column, 'sort') as HTMLElement).click()
  }

  test('draws the rows in order of the column, numbers by their value', async () => {
    const host = (await mount(sortable)) as Sorting
    await settle(host)
    expect(drawn(host)).toEqual(['web', 'billing'])
    const asked: string[] = []
    host.addEventListener('helix-sort', (event) => {
      asked.push((event as CustomEvent<{ value: string }>).detail.value)
    })

    press(host)
    await settle(host)
    expect(host.sort).toBe('count:asc')
    expect(drawn(host)).toEqual(['billing', 'web'])
    expect([...host.querySelectorAll('helix-headless-table-row')].map((row) => row.id)).toEqual([
      'web',
      'billing',
    ])
    expect((part(host, 'live') as HTMLElement).textContent).toBe('Sorted by Count, ascending')

    press(host)
    await settle(host)
    expect(drawn(host)).toEqual(['web', 'billing'])
    press(host)
    await settle(host)
    expect(host.sort).toBe('')
    expect(asked).toEqual(['count:asc', 'count:desc', ''])
  })

  test('keeps the order when the request is refused', async () => {
    const host = (await mount(sortable)) as Sorting
    await settle(host)
    host.addEventListener('helix-sort', (event) => event.preventDefault())
    press(host)
    await settle(host)
    expect(host.sort).toBe('')
    expect(drawn(host)).toEqual(['web', 'billing'])
  })

  test('starts in the order `default-sort` names', async () => {
    const host = (await mount(
      sortable.replace('label="Services"', 'label="Services" default-sort="count:asc"'),
    )) as Sorting
    await settle(host)
    expect(drawn(host)).toEqual(['billing', 'web'])
  })
})

describe('a table named from outside', () => {
  /* A table named by a heading beside it is the common case, and the name went
     onto a generic wrapper while the table itself kept "Table". */
  test('takes a host `aria-label` onto the table', async () => {
    const host = (await mount(
      '<helix-headless-table aria-label="Deployments"><helix-headless-table-row><helix-headless-table-cell>x</helix-headless-table-cell></helix-headless-table-row></helix-headless-table>',
    )) as Updating
    await settle(host)
    expect((part(host, 'table') as HTMLElement).getAttribute('aria-label')).toBe('Deployments')
  })
})

describe('an empty table', () => {
  /* A table owns rows. A paragraph directly inside one is a child the role
     does not allow. */
  test('says so in a row of its own', async () => {
    const host = (await mount(
      '<helix-headless-table label="Empty"><helix-headless-table-column>A</helix-headless-table-column></helix-headless-table>',
    )) as Updating
    await settle(host)
    const empty = part(host, 'empty') as HTMLElement
    expect(empty.getAttribute('role')).toBe('row')
    expect(empty.querySelector('[role="cell"]')?.textContent).toBe('Nothing to show')
  })
})

describe('a table sort, told after it stood', () => {
  test('sends helix-sorted with the order, and nothing for a refused one', async () => {
    const host = (await mount(sortable)) as Sorting
    await settle(host)
    const heard: string[] = []
    host.addEventListener('helix-sorted', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const column = host.querySelector('[field="count"]') as HTMLElement
    ;(part(column, 'sort') as HTMLElement).click()
    await settle(host)
    expect(heard).toEqual(['count:asc'])
    host.addEventListener('helix-sort', (event) => event.preventDefault())
    ;(part(column, 'sort') as HTMLElement).click()
    await settle(host)
    expect(heard).toEqual(['count:asc'])
  })
})

describe('a table with a heading', () => {
  test('keeps the heading out of its rows', async () => {
    const host = (await mount(
      markup.replace(
        '<helix-headless-table-column>Service',
        '<h2 slot="heading">Deployments this week</h2><helix-headless-table-column>Service',
      ),
    )) as Updating
    await settle(host)
    expect(slotted(host).map((row) => row.localName)).toEqual(['helix-headless-table-row'])
    const heading = host.shadowRoot?.querySelector('slot[name="heading"]') as HTMLSlotElement
    expect(heading.assignedElements().map((one) => one.localName)).toEqual(['h2'])
  })
})

describe('a selectable table', () => {
  type Selecting = Updating & { selected: string }

  const selectable = `
    <helix-headless-table label="Services" selectable default-selected="billing">
      <helix-headless-table-column>Service</helix-headless-table-column>
      <helix-headless-table-row value="web"><helix-headless-table-cell>web</helix-headless-table-cell></helix-headless-table-row>
      <helix-headless-table-row value="billing"><helix-headless-table-cell>billing</helix-headless-table-cell></helix-headless-table-row>
    </helix-headless-table>`

  const rows = (host: HTMLElement) =>
    [...host.querySelectorAll('helix-headless-table-row')] as (HTMLElement & {
      updateComplete: Promise<boolean>
    })[]

  const ask = (checkbox: Element | null | undefined, checked: boolean): void => {
    checkbox?.dispatchEvent(
      new CustomEvent('helix-before-toggle', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { checked },
      }),
    )
  }

  test('draws a checkbox cell in each row, named for it, ahead of the columns', async () => {
    const host = (await mount(selectable)) as Selecting
    await settle(host)
    const [web, billing] = rows(host)
    await web?.updateComplete
    const box = web?.shadowRoot?.querySelector('[part="checkbox"]')
    expect(box?.getAttribute('aria-label')).toBe('Select web')
    expect((box as unknown as { checked: boolean }).checked).toBe(false)
    expect(
      (
        billing?.shadowRoot?.querySelector('[part="checkbox"]') as unknown as
          | { checked: boolean }
          | undefined
      )?.checked,
    ).toBe(true)
    expect(template(host)).toMatch(/--table-template: max-content /)
    expect(part(host, 'select-all')?.getAttribute('role')).toBe('columnheader')
  })

  test('asks before a row is chosen, and says so after', async () => {
    const host = (await mount(selectable)) as Selecting
    await settle(host)
    const heard: string[] = []
    host.addEventListener('helix-selected', (event) => {
      heard.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    ask(rows(host)[0]?.shadowRoot?.querySelector('[part="checkbox"]'), true)
    await settle(host)
    expect(host.selected).toBe('billing,web')
    expect(heard).toEqual(['billing,web'])
    expect((part(host, 'live') as HTMLElement).textContent).toBe('2 selected')
    host.addEventListener('helix-select', (event) => event.preventDefault())
    ask(rows(host)[0]?.shadowRoot?.querySelector('[part="checkbox"]'), false)
    await settle(host)
    expect(host.selected).toBe('billing,web')
  })

  test('the heading selects every row, and then none', async () => {
    const host = (await mount(selectable)) as Selecting
    await settle(host)
    ask(part(host, 'select-all')?.querySelector('[part="checkbox"]'), true)
    await settle(host)
    expect(host.selected.split(',').sort()).toEqual(['billing', 'web'])
    ask(part(host, 'select-all')?.querySelector('[part="checkbox"]'), true)
    await settle(host)
    expect(host.selected).toBe('')
  })

  test('leaves a checkbox the consumer put in a cell alone', async () => {
    const host = (await mount(selectable)) as Selecting
    await settle(host)
    const own = document.createElement('input')
    own.setAttribute('part', 'checkbox')
    rows(host)[0]?.querySelector('helix-headless-table-cell')?.append(own)
    const event = new CustomEvent('helix-before-toggle', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { checked: true },
    })
    own.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(host.selected).toBe('billing')
  })
})
