import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import loadingMore from '../.examples/loading-more.html' with { type: 'text' }
import movingRows from '../.examples/moving-rows.html' with { type: 'text' }
import nestedRows from '../.examples/nested-rows.html' with { type: 'text' }
import paging from '../.examples/paging.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import searching from '../.examples/searching.html' with { type: 'text' }
import arranging from '../.examples/selecting-and-arranging.html' with { type: 'text' }
import serving from '../.examples/serving-the-first-page.html' with { type: 'text' }
import summary_and_size from '../.examples/summary-and-size.html' with { type: 'text' }
import windowed_paging from '../.examples/windowed-paging.html' with { type: 'text' }
import windowing from '../.examples/windowing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../input/index.js')
  await import('../../pagination/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

const rows = (table: HTMLElement): HTMLElement[] => [
  ...(table.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]
const first = (table: HTMLElement): string =>
  rows(table)[0]?.querySelector('[part~="cell"]')?.textContent?.trim() ?? ''
const next = (table: HTMLElement): void => {
  const pagination = table.shadowRoot?.querySelector('[part~="pagination"]') as HTMLElement | null
  ;(pagination?.shadowRoot?.querySelector('[part~="next"]') as HTMLElement | null)?.click()
}

describe('the arranging example', () => {
  run(
    'one row starts chosen, a click on another counts two, and the grips move columns',
    async () => {
      await example(arranging)
      const assets = document.getElementById('assets') as HTMLElement & { order: string }
      await idle()
      const chosen = rows(assets).filter((row) => row.getAttribute('aria-selected') === 'true')
      expect(chosen.map((row) => row.querySelector('[part~="cell"]')?.textContent?.trim())).toEqual(
        ['asset-002.webp'],
      )
      const box = rows(assets)[0]?.querySelector('[part~="checkbox"]') as HTMLElement
      box.shadowRoot?.querySelector('input')?.click()
      await idle()
      expect(document.getElementById('chosen')?.textContent).toBe('2 selected')
      const grip = document
        .querySelector('helix-table-column[field="name"]')
        ?.shadowRoot?.querySelector('[part="grip"]') as HTMLElement
      grip.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowRight' }),
      )
      await idle()
      expect(assets.order).toBe('size name kind')
    },
  )
})

describe('the paging example', () => {
  run('forty rows are five pages of eight, and the next page starts at the ninth', async () => {
    await example(paging)
    const assets = document.getElementById('assets') as HTMLElement
    expect(rows(assets)).toHaveLength(8)
    expect(first(assets)).toBe('asset-001.webp')
    next(assets)
    await idle()
    expect(first(assets)).toBe('asset-009.webp')
  })
})

describe('the searching example', () => {
  run('typing in the toolbar narrows the rows to what matches', async () => {
    await example(searching)
    const people = document.getElementById('people') as HTMLElement
    expect(rows(people)).toHaveLength(5)
    const query = document.getElementById('query') as HTMLElement
    type(query.shadowRoot?.querySelector('[part~="control"]') as HTMLInputElement, 'Lisbon')
    await idle()
    expect(rows(people)).toHaveLength(2)
  })
})

describe('the summary-and-size example', () => {
  run('a larger page size shows more rows and the summary follows the table', async () => {
    await example(summary_and_size)
    const files = document.getElementById('files') as HTMLElement & { pageSize: number }
    const range = document.getElementById('range') as HTMLElement & { pageSize: number }
    /* A `Select`, so the reader opens it and picks, as anywhere else. */
    const size = document.getElementById('size') as HTMLElement
    const select = size.shadowRoot?.querySelector('[part~="control"]') as HTMLElement
    select.shadowRoot?.querySelector<HTMLElement>('[part~="trigger"]')?.click()
    await idle()
    const sixteen = select.querySelector('[value="16"]')
    ;(sixteen?.shadowRoot?.querySelector('[part="item"]') as HTMLElement | null)?.click()
    await idle()
    expect(files.pageSize).toBe(16)
    expect(rows(files)).toHaveLength(16)
    next(files)
    await idle()
    expect(range.pageSize).toBe(16)
  })
})

describe('the events example', () => {
  run('sorting, searching and paging are each heard under their own name', async () => {
    await example(events)
    const objects = document.getElementById('objects') as HTMLElement
    ;(document.querySelector('helix-table-column[field="name"]') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-sort'])
    next(objects)
    await idle()
    expect(logged()).toEqual(['helix-sort', 'helix-navigate'])
  })
})

describe('the preview example', () => {
  run('sorted by name as asked, four to a page, sizes written as sizes', async () => {
    await example(preview)
    const files = document.getElementById('files') as HTMLElement
    await idle()
    expect(rows(files)).toHaveLength(4)
    expect(first(files)).toBe('archive.tar.gz')
    expect(files.shadowRoot?.textContent).not.toContain('4823100')
  })
})

describe('the windowing example', () => {
  run('five thousand rows draw only a window of them', async () => {
    await example(windowing)
    const assets = document.getElementById('assets') as HTMLElement
    await idle()
    expect(rows(assets).length).toBeGreaterThan(0)
    expect(rows(assets).length).toBeLessThan(200)
    expect(first(assets)).toBe('asset-0001.webp')
  })
})

describe('the windowed-paging example', () => {
  run('a page of five hundred is still drawn a window at a time', async () => {
    await example(windowed_paging)
    const assets = document.getElementById('assets') as HTMLElement
    await idle()
    expect(rows(assets).length).toBeLessThan(200)
    next(assets)
    await idle()
    expect(first(assets)).toBe('asset-0501.webp')
  })
})

describe('the loading-more example', () => {
  run('six rows named by their version, and six more from the last row', async () => {
    await example(loadingMore)
    const releases = document.getElementById('releases') as HTMLElement & { rows: unknown[] }
    await idle()
    expect(rows(releases)).toHaveLength(6)
    expect(rows(releases)[0]?.querySelector('[role="rowheader"]')?.textContent?.trim()).toBe(
      '2.24.0',
    )
    ;(releases.shadowRoot?.querySelector('[part="more-button"]') as HTMLElement | null)?.click()
    await idle()
    expect(rows(releases)).toHaveLength(12)
  })
})

describe('the nested-rows example', () => {
  run('src starts open with its files under it, and utils opens with a press', async () => {
    await example(nestedRows)
    const tree = document.getElementById('tree') as HTMLElement & { expanded: string }
    await idle()
    expect(rows(tree)).toHaveLength(5)
    expect(rows(tree)[0]?.getAttribute('aria-expanded')).toBe('true')
    ;(rows(tree)[2]?.querySelector('[part~="toggle"]') as HTMLElement | null)?.click()
    await idle()
    expect(tree.expanded).toBe('src,src/utils')
    expect(rows(tree)).toHaveLength(7)
  })
})

describe('the moving rows example', () => {
  run(
    'a key picks up the first job, Down moves it, and the drop sets the rows in that order',
    async () => {
      await example(movingRows)
      await idle()
      const queue = document.getElementById('queue') as HTMLElement
      const grip = queue.shadowRoot?.querySelector('[part="row-grip"]') as HTMLElement
      grip.focus()
      const press = (key: string): void => {
        grip.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
        )
      }
      press(' ')
      press('ArrowDown')
      press(' ')
      await idle()
      expect(first(queue)).toBe('Spring brochure')
      expect(rows(queue)[1]?.querySelector('[part~="cell"]')?.textContent?.trim()).toBe(
        'Invoice 1042',
      )
    },
  )
})

describe('the serving example', () => {
  /* The served rows are the page's markup and the drawn ones are the table's, so
     they line up only if the two are laid out alike. Measured cell by cell:
     the words, and the box each one sits in, before and after the rows draw. */
  run('the rows the page served stand where the drawn rows draw, with the same words', async () => {
    const [markup, script] = String(serving).split('<script>')
    await example(markup)
    await idle()
    const files = document.getElementById('files') as HTMLElement
    const box = (cell: Element): (number | string)[] => {
      const { height, width, x, y } = cell.getBoundingClientRect()
      return [
        cell.textContent?.trim() ?? '',
        ...[x, y, width, height].map((one) => Math.round(one)),
      ]
    }
    const served = [...files.querySelectorAll('helix-table-cell')].map(box)
    expect(served).toHaveLength(12)
    expect(rows(files)).toHaveLength(0)
    new Function(String(script).replace('</script>', ''))()
    await idle()
    const drawn = [...(files.shadowRoot?.querySelectorAll('[part~="cell"]') ?? [])].map(box)
    expect(drawn).toEqual(served)
  })
})

/* **Before the table upgrades, as a server's page arrives.** A frame of its own
 * has a registry of its own, so the same markup there stays undefined, laid
 * out by `helix.css` alone. Each heading and cell, and the table's height with
 * the pagination's row in it, must stand where the upgraded table puts them,
 * and the drawn rows where the served ones stood. */
describe('a data table that serves its first page, before it upgrades', () => {
  type Box = (number | string)[]

  /** Every heading and cell, by its place in the host, and the host's height. */
  const layout = (host: Element): Box[] => {
    const origin = host.getBoundingClientRect()
    const box = (one: Element): Box => {
      const shown =
        getComputedStyle(one).display === 'contents'
          ? (one.shadowRoot?.querySelector('[part="column"]') ?? one)
          : one
      const { height, width, x, y } = shown.getBoundingClientRect()
      return [
        one.textContent?.trim() ?? '',
        ...[x - origin.x, y - origin.y, width, height].map((value) => Math.round(value)),
      ]
    }
    const drawn = [...(host.shadowRoot?.querySelectorAll('[part~="row"] [part~="cell"]') ?? [])]
    const cells = drawn.length > 0 ? drawn : [...host.querySelectorAll('helix-table-cell')]
    return [
      ['height', Math.round(origin.height)],
      ...[...host.querySelectorAll(':scope > helix-table-column')].map(box),
      ...cells.map(box),
    ]
  }

  /** The markup in a frame with this page's stylesheets and no definitions. */
  const unupgraded = async (markup: string, width: number): Promise<Element> => {
    const frame = document.createElement('iframe')
    frame.style.cssText = `border: 0; block-size: 900px; inline-size: ${width}px`
    const sheets = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join('')
    frame.srcdoc = `<!doctype html>${sheets}<body style="margin: 0">${markup}</body>`
    const loaded = new Promise((done) => frame.addEventListener('load', done, { once: true }))
    document.body.append(frame)
    await loaded
    const host = frame.contentDocument?.querySelector('helix-data-table') as Element
    expect(frame.contentWindow?.customElements.get('helix-data-table')).toBeUndefined()
    return host
  }

  const sized = `<helix-data-table
    columns="minmax(5.5rem, 1.6fr) minmax(4.5rem, 1fr) max-content"
    default-sort="name:asc"
    id="roster"
    label="Roster"
    page-size="2"
    row-key="name"
    selectable
  >
    <helix-table-column field="name" sortable>Name</helix-table-column>
    <helix-table-column field="team">Team</helix-table-column>
    <helix-table-column field="reviews" text-align="end">Reviews</helix-table-column>
    <helix-table-row><helix-table-cell header>Ada Okonkwo</helix-table-cell><helix-table-cell>Platform</helix-table-cell><helix-table-cell>184</helix-table-cell></helix-table-row>
    <helix-table-row><helix-table-cell header>Bruno Salas</helix-table-cell><helix-table-cell>Payments</helix-table-cell><helix-table-cell>96</helix-table-cell></helix-table-row>
    <span slot="footer">3 people</span>
  </helix-data-table>`
  const people = [
    { name: 'Ada Okonkwo', reviews: 184, team: 'Platform' },
    { name: 'Bruno Salas', reviews: 96, team: 'Payments' },
    { name: 'Cai Wen', reviews: 231, team: 'Platform' },
  ]

  run('the served example stands still from the first paint to the drawn rows', async () => {
    const [markup, script] = String(serving).split('<script>')
    await example(markup)
    await idle()
    const files = document.getElementById('files') as HTMLElement
    const upgraded = layout(files)
    const before = layout(await unupgraded(String(markup), files.getBoundingClientRect().width))
    expect(before).toEqual(upgraded)
    new Function(String(script).replace('</script>', ''))()
    await idle()
    expect(layout(files)).toEqual(upgraded)
  })

  run('widths in `columns`, the checkbox column and a footer stand still too', async () => {
    await example(sized)
    await idle()
    const roster = document.getElementById('roster') as HTMLElement & { rows: unknown[] }
    const upgraded = layout(roster)
    const before = layout(await unupgraded(sized, roster.getBoundingClientRect().width))
    expect(before).toEqual(upgraded)
    roster.rows = people
    await idle()
    expect(layout(roster)).toEqual(upgraded)
  })
})
