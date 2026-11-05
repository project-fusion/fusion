import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import bleedStyles from '../.examples/bleed.css' with { type: 'text' }
import bleed from '../.examples/bleed.html' with { type: 'text' }

/* The `bleed` example as a page draws it: its script hands the table its rows,
   and the row it names is chosen. Where the boxes land only a browser says, so
   run the rest with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
  await import('../../divider/index.js')
})

/* An example runs its script only in the browser harness, so every one of these does. */
const geometry = hasLayout() ? test : (): void => {}

type Table = HTMLElement & Updatable

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const table = async (): Promise<Table> => {
  await example(bleed, bleedStyles)
  const host = document.querySelector('helix-data-table') as Table
  for (let at = 0; at < 4; at += 1) {
    await frame()
    await settle(host)
  }
  return host
}

const rows = (host: Table): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]

describe('the bleed example', () => {
  geometry('draws the rows its script hands the table, with the one it names chosen', async () => {
    const host = await table()
    const drawn = rows(host)
    expect(drawn.length).toBe(3)
    expect(drawn.map((row) => row.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  geometry('runs each row and its rule past the divider, with the words on it', async () => {
    const host = await table()
    const divider = (document.querySelector('helix-divider') as HTMLElement).getBoundingClientRect()
    const chosen = rows(host)[1] as HTMLElement
    const first = (chosen.firstElementChild as HTMLElement).getBoundingClientRect()
    const last = (chosen.lastElementChild as HTMLElement).getBoundingClientRect()
    expect(first.left).toBeLessThan(divider.left)
    expect(last.right).toBeGreaterThan(divider.right)
    expect(divider.left - first.left).toBeCloseTo(last.right - divider.right, 0)
    /* The heading's words on the divider's column, past the checkbox it keeps. */
    const heading = host
      .querySelector('helix-table-column')
      ?.shadowRoot?.querySelector('[part~="column"]') as HTMLElement
    expect(heading.getBoundingClientRect().left).toBeGreaterThan(divider.left)
  })
})
