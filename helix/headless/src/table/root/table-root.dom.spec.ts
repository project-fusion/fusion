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
 * carries its column's `align` as `--table-cell-align`, and what lining up
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
        <helix-headless-table-column align="end">Count</helix-headless-table-column>
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
     one's. The edge only: the hidden column keeps its track, which is the
     table's to drop and does not yet. */
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
      align?: string
    }
    count.setAttribute('align', 'end; } ::slotted(*) { display: none')
    await count.updateComplete
    await settle(host)
    const cells = [...host.querySelectorAll('helix-headless-table-cell')]
    expect(edge(cells[1])).toBe('')
    expect(getComputedStyle(cells[1] as Element).display).not.toBe('none')
  })
})
