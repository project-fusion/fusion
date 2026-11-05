import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { hasLayout, internalsOf, mount, registerDom, settle } from '@fusion.dev/helix-testing/dom'

/* A column that drops out of a narrow table, for its `min-table-width`. The
   table measures itself with a `ResizeObserver`, which happy-dom has no layout
   to drive, so these hand it a size through a stand-in. The block at the end
   runs on a real layout with `bun run specs:browser data-table`. */

type Table = HTMLElement & {
  csv(): string
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
}

/** Every stand-in observer made, so a spec can tell each table its size. */
const observers: { callback: ResizeObserverCallback; targets: Element[] }[] = []
const real = globalThis.ResizeObserver

/** The stand-in, which records each observer the table makes so a spec can tell it a size. */
class StandIn {
  private readonly entry: { callback: ResizeObserverCallback; targets: Element[] }
  constructor(callback: ResizeObserverCallback) {
    this.entry = { callback, targets: [] }
    observers.push(this.entry)
  }
  observe(target: Element): void {
    this.entry.targets.push(target)
  }
  disconnect(): void {
    this.entry.targets = []
  }
  unobserve(): void {}
}

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

/* Around each spec and not around the file, since every spec file shares one
   global in `bun test`. */
beforeEach(() => {
  if (!hasLayout()) {
    globalThis.ResizeObserver = StandIn as unknown as typeof ResizeObserver
  }
})

afterEach(() => {
  globalThis.ResizeObserver = real
})

/** Tells a table it is `inlineSize` pixels wide, as a browser would on a resize. */
const resize = async (table: Table, inlineSize: number): Promise<void> => {
  for (const { callback, targets } of observers) {
    if (targets.includes(table.shadowRoot?.querySelector('[part="table"]') as Element)) {
      callback(
        [
          {
            contentBoxSize: [{ blockSize: 0, inlineSize }],
            contentRect: { width: inlineSize },
            target: table,
          },
        ] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      )
    }
  }
  /* The table draws on the frame after a size it has to answer. */
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await table.updateComplete
}

const ROWS = [
  { name: 'api', owner: 'Ada', region: 'eu-central-1' },
  { name: 'web', owner: 'Lin', region: 'us-east-1' },
]

const table = async (columns = ''): Promise<Table> => {
  const host = (await mount(
    `<helix-headless-data-table label="Services">
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="region" min-table-width="30rem">Region</helix-headless-table-column>
      <helix-headless-table-column field="owner" min-table-width="640px">Owner</helix-headless-table-column>
      ${columns}
    </helix-headless-data-table>`,
  )) as Table
  host.rows = ROWS
  await host.updateComplete
  return host
}

/**
 * The headings the header draws, by their text. Read in a browser only:
 * happy-dom keeps a node that a later `assign()` leaves out, where a browser
 * unassigns it.
 */
const headings = (host: Table): string[] =>
  ((host.shadowRoot as ShadowRoot).querySelector('slot[name="columns"]') as HTMLSlotElement)
    .assignedElements()
    .filter((column) => !column.hasAttribute('hidden'))
    .map((column) => column.textContent?.trim() ?? '')

/** Each body row's cells, by their text. */
const cells = (host: Table): string[][] =>
  [...(host.shadowRoot?.querySelectorAll('[part~="row"]') ?? [])].map((row) =>
    [...row.querySelectorAll('[part~="cell"]')].map((cell) => cell.textContent?.trim() ?? ''),
  )

const template = (host: Table): string =>
  host.shadowRoot?.querySelector('[part="table"]')?.getAttribute('style') ?? ''

if (!hasLayout()) {
  describe('a column with a minimum table width', () => {
    test('shows while nothing has measured the table, as on a server', async () => {
      const host = await table()
      expect(headings(host)).toEqual(['Name', 'Region', 'Owner'])
    })

    test('drops its heading, its track and its cells below the width, and the rest stay in line', async () => {
      const host = await table()
      await resize(host, 800)
      expect(cells(host)[0]).toEqual(['api', 'eu-central-1', 'Ada'])
      await resize(host, 600)
      expect(cells(host)).toEqual([
        ['api', 'eu-central-1'],
        ['web', 'us-east-1'],
      ])
      expect(
        template(host)
          .split(':')[1]
          ?.trim()
          .split(/\s+(?![^(]*\))/),
      ).toHaveLength(2)
      expect(internalsOf(host).ariaColCount).toBe('2')
      await resize(host, 400)
      expect(cells(host)[0]).toEqual(['api'])
      expect(internalsOf(host).ariaColCount).toBe('1')
    })

    test('comes back in its place as the table widens', async () => {
      const host = await table()
      await resize(host, 400)
      await resize(host, 900)
      expect(cells(host)[0]).toEqual(['api', 'eu-central-1', 'Ada'])
      expect(internalsOf(host).ariaColCount).toBe('3')
    })

    test('reads a change to the minimum while the table stays the size it is', async () => {
      const host = await table()
      await resize(host, 600)
      const owner = host.querySelector('[field="owner"]') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      owner.setAttribute('min-table-width', '20rem')
      await owner.updateComplete
      await settle(host as never)
      expect(cells(host)[0]).toEqual(['api', 'eu-central-1', 'Ada'])
    })

    test('leaves one column showing where every column would go', async () => {
      const host = (await mount(
        `<helix-headless-data-table label="Services">
          <helix-headless-table-column field="name" min-table-width="50rem">Name</helix-headless-table-column>
          <helix-headless-table-column field="owner" min-table-width="50rem">Owner</helix-headless-table-column>
        </helix-headless-data-table>`,
      )) as Table
      host.rows = ROWS
      await resize(host, 300)
      expect(cells(host)[0]).toEqual(['api'])
      expect(internalsOf(host).ariaColCount).toBe('1')
    })

    test('a dropped column is still in the CSV, which has no width', async () => {
      const host = await table()
      await resize(host, 400)
      expect(host.csv().split(/\r?\n/)[0]).toBe('Name,Region,Owner')
    })
  })
}

if (hasLayout()) {
  describe('a column with a minimum table width, laid out', () => {
    /* One frame for the size, one for the draw it asks for, and room for both. */
    const frame = async (): Promise<void> => {
      for (let at = 0; at < 4; at += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
      }
    }

    test('drops out of a narrow table, and comes back as it widens', async () => {
      const host = await table()
      /* A width of its own, which an inline host on the headless tier takes
         only once it is a block. */
      host.style.display = 'block'
      host.style.inlineSize = '25rem'
      await frame()
      await host.updateComplete
      expect(headings(host)).toEqual(['Name'])
      host.style.inlineSize = '35rem'
      await frame()
      await host.updateComplete
      expect(headings(host)).toEqual(['Name', 'Region'])
      host.style.inlineSize = '50rem'
      await frame()
      await host.updateComplete
      expect(headings(host)).toEqual(['Name', 'Region', 'Owner'])
    })
  })
}
