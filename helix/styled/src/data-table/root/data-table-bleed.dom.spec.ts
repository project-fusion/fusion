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

  geometry(
    'keeps the rules on the divider’s column, and reaches the chosen row past it',
    async () => {
      const host = await table()
      const divider = (
        document.querySelector('helix-divider') as HTMLElement
      ).getBoundingClientRect()
      const chosen = rows(host)[1] as HTMLElement
      const first = chosen.firstElementChild as HTMLElement
      const last = chosen.lastElementChild as HTMLElement
      /* The cells and their rules on the divider's column. */
      expect(first.getBoundingClientRect().left).toBeCloseTo(divider.left, 0)
      expect(last.getBoundingClientRect().right).toBeCloseTo(divider.right, 0)
      /* The fill past it by the same amount each side. */
      const reach = Number.parseFloat(getComputedStyle(first, '::before').inlineSize)
      expect(reach).toBeGreaterThan(0)
      expect(Number.parseFloat(getComputedStyle(last, '::after').inlineSize)).toBeCloseTo(reach, 0)
    },
  )
})
