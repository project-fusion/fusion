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
