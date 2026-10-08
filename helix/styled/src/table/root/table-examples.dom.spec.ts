import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import windowed from '../.examples/windowed.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script, and draws
   no window without a box to measure. */
const run = hasLayout() ? test : (): void => {}

/** The rows the table draws: the ones its body slot is given. */
const drawn = (table: HTMLElement): Element[] =>
  table.shadowRoot
    ?.querySelector<HTMLSlotElement>('[part="table"] > slot:not([name])')
    ?.assignedElements() ?? []

describe('the windowed example', () => {
  run('draws the rows in view of a thousand, and says there are a thousand', async () => {
    await example(windowed)
    await idle()
    const requests = document.getElementById('requests') as HTMLElement
    expect(requests.querySelectorAll('helix-table-row')).toHaveLength(1000)
    const rows = drawn(requests)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(100)
    expect(rows[0]?.textContent).toContain('req-0001')
    expect(part(requests, 'table')?.getAttribute('aria-rowcount')).toBe('1001')
  })

  run('sorts every row, so a descending sort draws the last one first', async () => {
    await example(windowed)
    await idle()
    const requests = document.getElementById('requests') as HTMLElement & { sort: string }
    requests.sort = 'request:desc'
    await idle()
    expect(drawn(requests)[0]?.textContent).toContain('req-1000')
  })
})
