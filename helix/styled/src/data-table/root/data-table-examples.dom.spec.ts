import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import paging from '../.examples/paging.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import searching from '../.examples/searching.html' with { type: 'text' }
import summary_and_size from '../.examples/summary-and-size.html' with { type: 'text' }
import windowed_paging from '../.examples/windowed-paging.html' with { type: 'text' }
import windowing from '../.examples/windowing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../input/index.js')
  await import('../../pagination/index.js')
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
